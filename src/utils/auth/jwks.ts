import { createRemoteJWKSet } from "jose";

const region = process.env.AWS_REGION ?? "eu-west-1";

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getUserPoolId(): string {
    const id = process.env.COGNITO_USER_POOL_ID;
    if (!id) throw new Error("COGNITO_USER_POOL_ID environment variable is required");
    return id;
}

// The token issuer. Production uses the real Cognito URL; local dev against
// LocalStack sets COGNITO_ISSUER (e.g. http://localhost:4566/<poolId>) so JWT
// verification matches the `iss` claim LocalStack stamps into its tokens.
function getIssuer(): string {
    const override = process.env.COGNITO_ISSUER;
    if (override) return override.replace(/\/$/, "");
    return `https://cognito-idp.${region}.amazonaws.com/${getUserPoolId()}`;
}

export function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
    if (!_jwks) {
        _jwks = createRemoteJWKSet(new URL(`${getIssuer()}/.well-known/jwks.json`));
    }
    return _jwks;
}

export function getJWTIssuer(): string {
    return getIssuer();
}
