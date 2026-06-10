import { RDSDataClient, ExecuteStatementCommand, type Field } from "@aws-sdk/client-rds-data";

const lambdaKeyId = process.env["LAMBDA_AWS_KEY_ID"];
const lambdaSecret = process.env["LAMBDA_AWS_SECRET"];

const client = new RDSDataClient({
    region: process.env["AWS_REGION"] ?? "eu-west-1",
    ...(lambdaKeyId && lambdaSecret && {
        credentials: {
            accessKeyId: lambdaKeyId,
            secretAccessKey: lambdaSecret,
        },
    }),
});

type ParamValue = string | number | boolean | null | undefined;

function toField(val: ParamValue): Field {
    if (val === null || val === undefined) return { isNull: true };
    if (typeof val === "boolean") return { booleanValue: val };
    if (typeof val === "number") {
        return Number.isInteger(val) ? { longValue: val } : { doubleValue: val };
    }
    return { stringValue: String(val) };
}

function toRdsParams(sql: string, params: ParamValue[]) {
    const parameters: Array<{ name: string; value: Field }> = [];
    const transformed = sql.replace(/\$(\d+)/g, (_, n) => {
        const idx = Number(n) - 1;
        const name = `p${idx}`;
        parameters.push({ name, value: toField(params[idx]) });
        return `:${name}`;
    });
    return { sql: transformed, parameters };
}

export interface QueryResult<T = Record<string, unknown>> {
    rows: T[];
}

const db = {
    async query<T = Record<string, unknown>>(
        sql: string,
        params: ParamValue[] = []
    ): Promise<QueryResult<T>> {
        const { sql: transformedSql, parameters } = toRdsParams(sql, params);
        const result = await client.send(
            new ExecuteStatementCommand({
                resourceArn: process.env["AURORA_CLUSTER_ARN"]!,
                secretArn: process.env["AURORA_SECRET_ARN"]!,
                database: process.env["DB_NAME"] ?? "wedding",
                sql: transformedSql,
                parameters,
                formatRecordsAs: "JSON",
            })
        );
        const rows = result.formattedRecords
            ? (JSON.parse(result.formattedRecords) as T[])
            : [];
        return { rows };
    },
};

export function getDb() {
    return db;
}
