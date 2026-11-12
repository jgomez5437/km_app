import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "nexus_session";

let warnedMissingSecret = false;

function getJwtKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production" && !warnedMissingSecret) {
      warnedMissingSecret = true;
      console.warn(
        "WARNING: AUTH_SECRET (or NEXTAUTH_SECRET / JWT_SECRET) is not set in production. Using fallback signing key. For enhanced security, set AUTH_SECRET in your Vercel project environment variables."
      );
    }
    return new TextEncoder().encode("nexus_vault_default_secret_key_32chars_long_minimum");
  }
  return new TextEncoder().encode(secret);
}

export interface AuthSessionPayload {
  userId: string;
  email: string;
  name?: string;
}

/**
 * Creates a signed JWT session token valid for 30 days
 */
export async function createSessionToken(payload: AuthSessionPayload): Promise<string> {
  const key = getJwtKey();
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key);
}

/**
 * Verifies and decodes a signed JWT session token
 */
export async function verifySessionToken(token: string): Promise<AuthSessionPayload | null> {
  try {
    const key = getJwtKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Reads the session cookie and returns the authenticated user payload (or null)
 */
export async function getSessionUser(): Promise<AuthSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
