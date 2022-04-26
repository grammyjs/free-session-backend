import { Api } from "https://deno.land/x/grammy@v1.8.0/mod.ts";
import { importKey, Jwt } from "./crypto.ts";

const env = Deno.env.get("SECRET_KEY");
if (!env) {
  const msg =
    "SECRET_KEY must not be empty! Generate a new key with the `genkey.ts` script.";
  throw new Error(msg);
}

const key = await importKey(env);
const jwt = new Jwt(key);

export async function login(token: unknown) {
  if (typeof token !== "string" || !token) {
    return new Response("expected token string in request body", {
      status: 400,
    });
  }
  const api = new Api(token);
  try {
    const me = await api.getMe();
    const token = await jwt.signToken(me.id);
    return new Response(JSON.stringify({ token }), {
      headers: { "content-type": "application/json" },
      status: 201,
    });
  } catch {
    return new Response("invalid bot token", { status: 401 });
  }
}

type AuthResult = { ok: false } | { ok: true; id: number };
export async function auth(token: string | null): Promise<AuthResult> {
  if (token === null) return { ok: false };
  const id = await jwt.verifyToken(token.substring("Bearer ".length));
  return id === false ? { ok: false } : { ok: true, id };
}
