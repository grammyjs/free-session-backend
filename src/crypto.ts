// import jwt from "jsonwebtoken";
import { create, verify } from "https://deno.land/x/djwt@v2.4/mod.ts";

export class Jwt {
  constructor(private readonly key: CryptoKey) {}

  async signToken(id: number): Promise<string> {
    return await create(
      { alg: "HS512", typ: "JWT", jwtid: crypto.randomUUID() },
      { id },
      this.key,
    );
  }

  async verifyToken(
    token: string,
  ): Promise<number | false> {
    try {
      const data: Record<string, unknown> = await verify(token, this.key);
      return typeof data === "object" &&
        data !== null &&
        "id" in data &&
        typeof data.id === "number" &&
        data.id;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-512" },
    true,
    ["sign", "verify"],
  );
}

export async function importKey(key: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "jwk",
    JSON.parse(key),
    { name: "HMAC", hash: "SHA-512" },
    true,
    ["sign", "verify"],
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  return JSON.stringify(await crypto.subtle.exportKey("jwk", key));
}
