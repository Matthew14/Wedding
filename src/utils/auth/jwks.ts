import { createRemoteJWKSet } from "jose";

const region = process.env.AWS_REGION ?? "eu-west-1";
const userPoolId = process.env.COGNITO_USER_POOL_ID;

if (!userPoolId) {
    throw new Error("COGNITO_USER_POOL_ID environment variable is required");
}

export const JWKS = createRemoteJWKSet(
    new URL(`https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`)
);

export const JWT_ISSUER = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
