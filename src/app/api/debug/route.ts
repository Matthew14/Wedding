import { NextResponse } from "next/server";
import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";

// Temporary diagnostic endpoint — DELETE after debugging
export async function GET() {
    const keyId = process.env["LAMBDA_AWS_KEY_ID"];
    const secret = process.env["LAMBDA_AWS_SECRET"];
    const clusterArn = process.env["AURORA_CLUSTER_ARN"];
    const secretArn = process.env["AURORA_SECRET_ARN"];

    const envCheck = {
        LAMBDA_AWS_KEY_ID: keyId ? `set (${keyId.slice(0, 8)}...)` : "NOT SET",
        LAMBDA_AWS_SECRET: secret ? "set" : "NOT SET",
        AURORA_CLUSTER_ARN: clusterArn ? `set (${clusterArn.slice(-20)})` : "NOT SET",
        AURORA_SECRET_ARN: secretArn ? `set (${secretArn.slice(-20)})` : "NOT SET",
    };

    let dbResult: string;
    try {
        const client = new RDSDataClient({
            region: "eu-west-1",
            ...(keyId && secret && {
                credentials: { accessKeyId: keyId, secretAccessKey: secret },
            }),
        });
        const res = await client.send(new ExecuteStatementCommand({
            resourceArn: clusterArn!,
            secretArn: secretArn!,
            database: "wedding",
            sql: "SELECT 1 AS ok",
        }));
        dbResult = `OK — ${JSON.stringify(res.records)}`;
    } catch (e) {
        dbResult = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }

    return NextResponse.json({ envCheck, dbResult });
}
