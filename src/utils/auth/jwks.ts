import { createRemoteJWKSet } from "jose";

const region = process.env.AWS_REGION ?? "eu-west-1";

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getUserPoolId(): string {
    const id = process.env.COGNITO_USER_POOL_ID;
    if (!id) throw new Error("COGNITO_USER_POOL_ID environment variable is required");
    return id;
}

export function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
    if (!_jwks) {
        _jwks = createRemoteJWKSet(
            new URL(`https://cognito-idp.${region}.amazonaws.com/${getUserPoolId()}/.well-known/jwks.json`)
        );
    }
    return _jwks;
}

export function getJWTIssuer(): string {
    return `https://cognito-idp.${region}.amazonaws.com/${getUserPoolId()}`;
}
