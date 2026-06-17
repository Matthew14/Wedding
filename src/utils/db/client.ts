import { RDSDataClient, ExecuteStatementCommand, type Field } from "@aws-sdk/client-rds-data";

const lambdaKeyId = process.env["LAMBDA_AWS_KEY_ID"];
const lambdaSecret = process.env["LAMBDA_AWS_SECRET"];

// AWS_ENDPOINT_URL points the RDS Data API client at LocalStack in local dev.
const endpoint = process.env["AWS_ENDPOINT_URL"];

const client = new RDSDataClient({
    region: process.env["AWS_REGION"] ?? "eu-west-1",
    ...(endpoint && { endpoint }),
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

// Convert an RDS Data API Field back to a plain JS value (used only for the
// legacy `records` fallback path — see query() below).
function fieldToValue(field: Field): unknown {
    if (field.isNull) return null;
    if (field.stringValue !== undefined) return field.stringValue;
    if (field.longValue !== undefined) return field.longValue;
    if (field.doubleValue !== undefined) return field.doubleValue;
    if (field.booleanValue !== undefined) return field.booleanValue;
    if (field.blobValue !== undefined) return field.blobValue;
    return null;
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
                includeResultMetadata: true,
            })
        );

        // Real Aurora returns JSON-formatted rows in `formattedRecords`. LocalStack
        // populates this for SELECTs but falls back to the legacy `records` +
        // `columnMetadata` shape for `INSERT ... RETURNING`, so reconstruct rows
        // from those when `formattedRecords` is absent. On real Aurora this branch
        // never runs.
        let rows: T[];
        if (result.formattedRecords) {
            rows = JSON.parse(result.formattedRecords) as T[];
        } else if (result.records) {
            const names = (result.columnMetadata ?? []).map((c) => c.name ?? c.label ?? "");
            rows = result.records.map((record) => {
                const row: Record<string, unknown> = {};
                record.forEach((field, i) => {
                    row[names[i] ?? `col${i}`] = fieldToValue(field);
                });
                return row as T;
            });
        } else {
            rows = [];
        }
        return { rows };
    },
};

export function getDb() {
    return db;
}
