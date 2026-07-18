import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as rekognition from 'aws-cdk-lib/aws-rekognition';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class WeddingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── VPC ──────────────────────────────────────────────────────────────────
    const vpc = new ec2.Vpc(this, 'WeddingVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'Private', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });

    // ── S3 bucket ─────────────────────────────────────────────────────────────
    const photosBucket = new s3.Bucket(this, 'PhotosBucket', {
      bucketName: 'oneill-wedding-photos',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: ['https://oneill.wedding'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(730),
            },
          ],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ── CloudFront ────────────────────────────────────────────────────────────
    const distribution = new cloudfront.Distribution(this, 'PhotosCdn', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(photosBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        // Block direct access to originals — served via pre-signed URLs only
        'uploads/original/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(photosBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(this, 'BlockOriginals', {
            customHeadersBehavior: {
              customHeaders: [
                { header: 'Cache-Control', value: 'no-store', override: true },
              ],
            },
          }),
        },
      },
    });

    // ── Aurora Serverless v2 ──────────────────────────────────────────────────
    const dbSecret = new secretsmanager.Secret(this, 'DbSecret', {
      secretName: 'wedding/db-credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'wedding_admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/',
      },
    });

    const auroraCluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_4,
      }),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 4,
      writer: rds.ClusterInstance.serverlessV2('writer'),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      credentials: rds.Credentials.fromSecret(dbSecret),
      enableDataApi: true,
      defaultDatabaseName: 'wedding',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ── DynamoDB (#150 — replaces Aurora; cluster stays until cutover is verified) ──
    // Frozen wedding data (invitations, codes, RSVP/invitee archive) in one
    // table. Code validation is a GetItem on CODE#<code>; the dashboard reads
    // the whole dataset (~141 items) with a Scan, so no GSIs are needed.
    //   CODE#<code>       / META          — invitation code
    //   INVITATION#<id>   / META          — invitation
    //   INVITATION#<id>   / RSVP#<id>     — archived RSVP
    //   INVITATION#<id>   / INVITEE#<id>  — archived invitee
    const archiveTable = new dynamodb.Table(this, 'ArchiveTable', {
      tableName: 'wedding-archive',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const photosTable = new dynamodb.Table(this, 'PhotosTable', {
      tableName: 'wedding-photos',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    // Gallery/moderation listing: photos of a status, newest first.
    photosTable.addGlobalSecondaryIndex({
      indexName: 'byStatus',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uploaded_at', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    // Upload rate limiting: count a code's uploads in the last hour.
    photosTable.addGlobalSecondaryIndex({
      indexName: 'byCode',
      partitionKey: { name: 'invitation_code', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uploaded_at', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.KEYS_ONLY,
    });
    // photo-processor: find the photo row for an uploaded S3 object.
    photosTable.addGlobalSecondaryIndex({
      indexName: 'byS3Key',
      partitionKey: { name: 's3_key', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.KEYS_ONLY,
    });

    const categoriesTable = new dynamodb.Table(this, 'PhotoCategoriesTable', {
      tableName: 'wedding-photo-categories',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // One item per face Rekognition detects in a photo. Cluster assignment is
    // denormalized onto every face row (no cluster-metadata items) — the admin
    // labeling page reads the whole table (a few thousand tiny items) and
    // groups in code, matching the archive table's scan-and-assemble pattern.
    const facesTable = new dynamodb.Table(this, 'PhotoFacesTable', {
      tableName: 'wedding-photo-faces',
      partitionKey: { name: 'face_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // The table holds weeks of manual labeling work — recoverable if an
      // automated pass (or an admin slip) ever mangles it.
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    // photo-processor idempotency ("is this photo already indexed?") and cleanup.
    facesTable.addGlobalSecondaryIndex({
      indexName: 'byPhoto',
      partitionKey: { name: 'photo_id', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    // Admin cluster detail + assignment fan-out (update every face in a cluster).
    facesTable.addGlobalSecondaryIndex({
      indexName: 'byCluster',
      partitionKey: { name: 'cluster_id', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    // Guest "Find My Photos": faces assigned to an invitee. Sparse — rows
    // without an invitee_id (unassigned/ignored clusters) never appear here.
    facesTable.addGlobalSecondaryIndex({
      indexName: 'byInvitee',
      partitionKey: { name: 'invitee_id', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // The Next.js SSR runtime authenticates as the pre-existing
    // `wedding-api-lambda` IAM user (Amplify bakes its keys into the bundle),
    // so grant it table access via an attached managed policy.
    const apiUser = iam.User.fromUserName(this, 'ApiUser', 'wedding-api-lambda');
    new iam.ManagedPolicy(this, 'DynamoAccessPolicy', {
      users: [apiUser],
      statements: [
        // The archive is the frozen wedding dataset — nothing in the app
        // writes to it, so keep the grant read-only.
        new iam.PolicyStatement({
          actions: [
            'dynamodb:GetItem',
            'dynamodb:BatchGetItem',
            'dynamodb:Query',
            'dynamodb:Scan',
          ],
          resources: [archiveTable.tableArn],
        }),
        new iam.PolicyStatement({
          actions: [
            'dynamodb:GetItem',
            'dynamodb:BatchGetItem',
            'dynamodb:Query',
            'dynamodb:Scan',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
          ],
          resources: [
            photosTable.tableArn,
            `${photosTable.tableArn}/index/*`,
            categoriesTable.tableArn,
            facesTable.tableArn,
            `${facesTable.tableArn}/index/*`,
          ],
        }),
        // App-side deletes: face rows (re-cluster/cleanup, and cascade when a
        // photo is deleted) and photo rows (admin permanently deleting a
        // rejected photo). The frozen archive stays undeletable.
        new iam.PolicyStatement({
          actions: ['dynamodb:DeleteItem'],
          resources: [facesTable.tableArn, photosTable.tableArn],
        }),
        // Presigned URLs (guest photo downloads and uploads) are signed as
        // this user, so S3 evaluates ITS permissions when the URL is used —
        // without this grant every presigned URL 403s. Originals only:
        // thumbnails are served publicly through CloudFront's OAC instead.
        new iam.PolicyStatement({
          actions: ['s3:GetObject', 's3:PutObject'],
          resources: [`${photosBucket.bucketArn}/uploads/original/*`],
        }),
        // Permanently deleting a rejected photo removes its original AND its
        // generated thumbnail.
        new iam.PolicyStatement({
          actions: ['s3:DeleteObject'],
          resources: [
            `${photosBucket.bucketArn}/uploads/original/*`,
            `${photosBucket.bucketArn}/uploads/thumbnail/*`,
          ],
        }),
      ],
    });

    // ── SES (admin upload notifications) ─────────────────────────────────────
    // The domain identity lets photos@oneill.wedding send; DKIM CNAMEs land
    // in the Route53 zone automatically. The account stays in the SES
    // sandbox, which is fine because the ONLY recipient is the admin — whose
    // address is verified by the second identity (a confirmation email
    // arrives on first deploy; click it once).
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'WeddingZone', {
      hostedZoneId: 'Z0934871XWIQZAKBW951',
      zoneName: 'oneill.wedding',
    });
    new ses.EmailIdentity(this, 'SesDomainIdentity', {
      identity: ses.Identity.publicHostedZone(zone),
    });
    new ses.EmailIdentity(this, 'SesAdminRecipient', {
      identity: ses.Identity.email('matthew@matthewoneill.com'),
    });

    // ── photo-processor Lambda ───────────────────────────────────────────────
    const photoProcessor = new NodejsFunction(this, 'PhotoProcessor', {
      entry: path.join(__dirname, '../lambdas/photo-processor/index.ts'),
      handler: 'handler',
      // Fixed name so the dashboard's re-match trigger can invoke it without
      // env-var plumbing. NOTE: naming a previously auto-named function makes
      // CloudFormation REPLACE it (brief harmless window during deploy).
      functionName: 'wedding-photo-processor',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      // 2 min covered thumbnailing; the re-match mode walks every unassigned
      // face (SearchFaces each), which needs headroom at ~2k faces. The
      // longer cap also applies to S3-triggered runs — accepted: a hung
      // invocation holds a slot longer, but post-wedding upload volume is a
      // trickle and the account's default concurrency dwarfs it.
      timeout: cdk.Duration.minutes(10),
      // 512 MB OOMed on large JPEGs during the professional photo import
      // (decoded pixel buffers dwarf the file size — an 11 MB JPEG was enough).
      // Guest uploads go up to 20 MB, so give sharp real headroom.
      memorySize: 1536,
      bundling: {
        // heic-convert stays a real node_module (not esbuild-inlined) so its
        // WASM decoder loads the way its loader expects.
        nodeModules: ['sharp', 'heic-convert'],
        // sharp ships per-platform binaries; force npm to stage the Lambda's
        // platform (linux/arm64) rather than the machine running `cdk deploy`.
        environment: {
          npm_config_os: 'linux',
          npm_config_cpu: 'arm64',
          npm_config_libc: 'glibc',
        },
      },
      environment: {
        PHOTOS_TABLE: photosTable.tableName,
        S3_BUCKET: photosBucket.bucketName,
        FACES_TABLE: facesTable.tableName,
        REKOGNITION_COLLECTION_ID: 'wedding-faces-2026',
        // 95 proved too loose in production: different people wearing
        // sunglasses cross-match above it, which chained 44% of all faces
        // into one cluster during the backfill.
        FACE_MATCH_THRESHOLD: '97',
        ARCHIVE_TABLE: archiveTable.tableName,
        CDN_URL: `https://${distribution.distributionDomainName}`,
        NOTIFY_FROM: 'photos@oneill.wedding',
        NOTIFY_TO: 'matthew@matthewoneill.com',
        SITE_URL: 'https://oneill.wedding',
      },
    });
    photosBucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(photoProcessor),
      { prefix: 'uploads/original/' }
    );
    photosBucket.grantReadWrite(photoProcessor);
    photosTable.grantReadWriteData(photoProcessor);
    facesTable.grantReadWriteData(photoProcessor);
    // Read-only: resolving an uploader's code to household names for the
    // notification email (the archive stays frozen).
    archiveTable.grantReadData(photoProcessor);
    photoProcessor.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail'],
        resources: [
          `arn:aws:ses:${this.region}:${this.account}:identity/oneill.wedding`,
          `arn:aws:ses:${this.region}:${this.account}:identity/matthew@matthewoneill.com`,
        ],
      })
    );
    // The dashboard's "Re-match unassigned" button async-invokes the Lambda —
    // the app itself has no Rekognition permissions by design.
    photoProcessor.grantInvoke(apiUser);

    // ── Cognito User Pool ─────────────────────────────────────────────────────
    const userPool = new cognito.UserPool(this, 'AdminUserPool', {
      userPoolName: 'wedding-admin',
      signInAliases: { email: true },
      selfSignUpEnabled: false,
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { otp: true, sms: false },
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'AdminClient', {
      userPool,
      authFlows: { userPassword: true, userSrp: true },
      generateSecret: true,
    });

    new secretsmanager.Secret(this, 'CognitoClientSecret', {
      secretName: 'wedding/cognito-client-secret',
      secretStringValue: userPoolClient.userPoolClientSecret,
    });

    // ── Rekognition face collection ───────────────────────────────────────────
    new rekognition.CfnCollection(this, 'FaceCollection', {
      collectionId: 'wedding-faces-2026',
    });

    const rekognitionPolicy = new iam.ManagedPolicy(this, 'RekognitionPolicy', {
      statements: [
        new iam.PolicyStatement({
          actions: [
            'rekognition:IndexFaces',
            'rekognition:SearchFaces',
            'rekognition:SearchFacesByImage',
            'rekognition:ListFaces',
            'rekognition:DeleteFaces',
          ],
          resources: [
            `arn:aws:rekognition:${this.region}:${this.account}:collection/wedding-faces-2026`,
          ],
        }),
        // Dog detection (Maggie in the gallery's people search). DetectLabels
        // doesn't operate on a collection, so it can't be resource-scoped.
        new iam.PolicyStatement({
          actions: ['rekognition:DetectLabels'],
          resources: ['*'],
        }),
      ],
    });
    // Only the photo-processor talks to Rekognition at runtime — the Next.js
    // app reads face matches from DynamoDB. The backfill script runs with
    // local admin credentials.
    rekognitionPolicy.attachToRole(photoProcessor.role!);

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'CloudFrontDomain', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL (NEXT_PUBLIC_CLOUDFRONT_URL)',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID (COGNITO_USER_POOL_ID)',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID (COGNITO_CLIENT_ID)',
    });

    new cdk.CfnOutput(this, 'AuroraClusterArn', {
      value: auroraCluster.clusterArn,
      description: 'Aurora cluster ARN',
    });

    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: dbSecret.secretArn,
      description: 'DB credentials secret ARN',
    });

    new cdk.CfnOutput(this, 'ArchiveTableName', {
      value: archiveTable.tableName,
      description: 'DynamoDB archive table (DDB_ARCHIVE_TABLE)',
    });

    new cdk.CfnOutput(this, 'PhotosTableName', {
      value: photosTable.tableName,
      description: 'DynamoDB photos table (DDB_PHOTOS_TABLE)',
    });

    new cdk.CfnOutput(this, 'PhotoCategoriesTableName', {
      value: categoriesTable.tableName,
      description: 'DynamoDB photo categories table (DDB_CATEGORIES_TABLE)',
    });

    new cdk.CfnOutput(this, 'PhotoFacesTableName', {
      value: facesTable.tableName,
      description: 'DynamoDB photo faces table (DDB_FACES_TABLE)',
    });

    new cdk.CfnOutput(this, 'PhotosBucketName', {
      value: photosBucket.bucketName,
      description: 'S3 photos bucket name',
    });

    new cdk.CfnOutput(this, 'RekognitionPolicyArn', {
      value: rekognitionPolicy.managedPolicyArn,
      description: 'Rekognition policy ARN — attached to the photo-processor Lambda role',
    });

  }
}
