import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { parse } from "cookie";
import type { Request } from "express";
import type { User } from "./db";
import { ENV } from "./_core/env";
import { getCredentialUserById } from "./db";

export const CREDENTIAL_COOKIE_NAME = "visioninspect_credential";
export const CREDENTIAL_SESSION_TTL_SECONDS = 60 * 15;

type CredentialSession = {
  userId: number;
  sessionVersion: number;
};

function getSecret(secret = ENV.cookieSecret) {
  if (!secret) throw new Error("Credential JWT secret is not configured");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createCredentialToken(session: CredentialSession, secret?: string) {
  return new SignJWT({ kind: "credential", ver: session.sessionVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(session.userId))
    .setIssuedAt()
    .setExpirationTime(`${CREDENTIAL_SESSION_TTL_SECONDS}s`)
    .sign(getSecret(secret));
}

export async function verifyCredentialToken(token: string | undefined, secret?: string): Promise<CredentialSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(secret), { algorithms: ["HS256"] });
    const userId = Number(payload.sub);
    const sessionVersion = Number(payload.ver);
    if (payload.kind !== "credential" || !Number.isInteger(userId) || userId < 1 || !Number.isInteger(sessionVersion) || sessionVersion < 0) return null;
    return { userId, sessionVersion };
  } catch {
    return null;
  }
}

export async function authenticateCredentialRequest(req: Request): Promise<User | null> {
  const token = parse(req.headers.cookie ?? "")[CREDENTIAL_COOKIE_NAME];
  const session = await verifyCredentialToken(token);
  if (!session) return null;

  const user = await getCredentialUserById(session.userId);
  if (!user || user.accountStatus !== "active" || user.credentialSessionVersion !== session.sessionVersion) return null;
  return user;
}
