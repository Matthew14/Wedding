import { createRemoteJWKSet } from "jose";

const region = process.env.AWS_REGION ?? "eu-west-1";
const userPoolId = process.env.COGNITO_USER_POOL_ID!;

export const JWKS = createRemoteJWKSet(
    new URL(`https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`)
);

export const JWT_ISSUER = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
