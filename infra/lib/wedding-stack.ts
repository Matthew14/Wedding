import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as rekognition from 'aws-cdk-lib/aws-rekognition';
import * as iam from 'aws-cdk-lib/aws-iam';
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

    const cognitoClientSecret = new secretsmanager.Secret(this, 'CognitoClientSecret', {
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
            'rekognition:SearchFacesByImage',
            'rekognition:DeleteFaces',
          ],
          resources: [
            `arn:aws:rekognition:${this.region}:${this.account}:collection/wedding-faces-2026`,
          ],
        }),
      ],
    });

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

    new cdk.CfnOutput(this, 'PhotosBucketName', {
      value: photosBucket.bucketName,
      description: 'S3 photos bucket name',
    });

    new cdk.CfnOutput(this, 'RekognitionPolicyArn', {
      value: rekognitionPolicy.managedPolicyArn,
      description: 'Rekognition policy ARN — attach to Amplify execution role',
    });

    // Suppress unused variable warnings for cognitoClientSecret
    void cognitoClientSecret;
  }
}
