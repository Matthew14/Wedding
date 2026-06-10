import {
    CloudWatchLogsClient,
    PutLogEventsCommand,
    CreateLogStreamCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const LOG_GROUP = "/wedding/app";

const cwClient = new CloudWatchLogsClient({
    region: process.env["AWS_REGION"] ?? "eu-west-1",
    ...(process.env["LAMBDA_AWS_KEY_ID"] && process.env["LAMBDA_AWS_SECRET"] && {
        credentials: {
            accessKeyId: process.env["LAMBDA_AWS_KEY_ID"],
            secretAccessKey: process.env["LAMBDA_AWS_SECRET"],
        },
    }),
});

// Cache which streams we've already created this process lifetime
const knownStreams = new Set<string>();

function streamName(): string {
    return new Date().toISOString().slice(0, 10); // "2026-06-10"
}

async function ensureStream(stream: string): Promise<void> {
    if (knownStreams.has(stream)) return;
    try {
        await cwClient.send(new CreateLogStreamCommand({
            logGroupName: LOG_GROUP,
            logStreamName: stream,
        }));
    } catch (e: unknown) {
        if ((e as { name?: string }).name !== "ResourceAlreadyExistsException") throw e;
    }
    knownStreams.add(stream);
}

type Level = "INFO" | "WARN" | "ERROR";

interface LogEntry {
    level: Level;
    route: string;
    message: string;
    data?: unknown;
}

async function write(entry: LogEntry): Promise<void> {
    const stream = streamName();
    try {
        await ensureStream(stream);
        await cwClient.send(new PutLogEventsCommand({
            logGroupName: LOG_GROUP,
            logStreamName: stream,
            logEvents: [{
                timestamp: Date.now(),
                message: JSON.stringify(entry),
            }],
        }));
    } catch {
        // Never let logging failures break the app — fall back to console
        console.error("[logger]", JSON.stringify(entry));
    }
}

export function info(route: string, message: string, data?: unknown): void {
    void write({ level: "INFO", route, message, data });
}

export function warn(route: string, message: string, data?: unknown): void {
    void write({ level: "WARN", route, message, data });
}

// Awaited so the error is guaranteed to land before the response returns
export async function error(route: string, message: string, err?: unknown): Promise<void> {
    const data = err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : err;
    await write({ level: "ERROR", route, message, data });
}
