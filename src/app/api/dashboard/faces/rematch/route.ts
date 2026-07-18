import { NextRequest, NextResponse } from "next/server";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { requireAuth } from "@/utils/auth/requireAuth";

// The app has no Rekognition permissions by design, so re-matching runs in
// the photo-processor Lambda; this route just fires the async invocation.
const endpoint = process.env["AWS_ENDPOINT_URL"];
const lambdaClient = new LambdaClient({
    region: process.env["AWS_REGION"] ?? "eu-west-1",
    ...(endpoint && { endpoint }),
    ...(process.env["LAMBDA_AWS_KEY_ID"] && process.env["LAMBDA_AWS_SECRET"] && {
        credentials: {
            accessKeyId: process.env["LAMBDA_AWS_KEY_ID"],
            secretAccessKey: process.env["LAMBDA_AWS_SECRET"],
        },
    }),
});

// The CDK stack pins this name; env override exists for local setups.
const PHOTO_PROCESSOR_FUNCTION =
    process.env["PHOTO_PROCESSOR_FUNCTION"] || "wedding-photo-processor";

// Fire-and-forget: give every unassigned, unignored face another SearchFaces
// pass against the (now better-labeled) collection.
export async function POST(request: NextRequest) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        await lambdaClient.send(
            new InvokeCommand({
                FunctionName: PHOTO_PROCESSOR_FUNCTION,
                InvocationType: "Event",
                Payload: JSON.stringify({ action: "rematch_faces" }),
            })
        );
        return NextResponse.json({ started: true }, { status: 202 });
    } catch (error) {
        console.error("Error in POST /api/dashboard/faces/rematch:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
