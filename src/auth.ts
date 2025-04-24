import { Api } from "https://deno.land/x/grammy@v1.36.1/mod.ts";
import { importKey, Jwt } from "./crypto.ts";

const env = Deno.env.get("SECRET_KEY");
if (!env) {
  const msg =
    "SECRET_KEY must not be empty! Generate a new key with the `genkey.ts` script.";
  throw new Error(msg);
}

const headers = { "content-type": "application/json" };

const key = await importKey(env);
const jwt = new Jwt(key);

export async function login(token: unknown) {
  if (typeof token !== "string" || !token) {
    return new Response(
      JSON.stringify({ error: "expected token string in request body" }),
      { headers, status: 400 },
    );
  }
  const api = new Api(token);
  try {
    const me = await api.getMe();
    const token = await jwt.signToken(me.id);
    return new Response(JSON.stringify({ token }), {
      headers,
      status: 201,
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "invalid bot token" }), {
      headers,
      status: 401,
    });
  }
}

type AuthResult = { ok: false } | { ok: true; id: number };
export async function auth(token: string | null): Promise<AuthResult> {
  if (token === null) return { ok: false };
  const id = await jwt.verifyToken(token.substring("Bearer ".length));
  return id === false ? { ok: false } : { ok: true, id };
}
