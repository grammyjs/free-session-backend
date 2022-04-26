import { serve } from "https://deno.land/std@0.136.0/http/server.ts";
import { S3SessionStore } from "./session.ts";
import { auth, login } from "./auth.ts";

const s3Endpoint = Deno.env.get("S3_ENDPOINT");
const s3Region = Deno.env.get("S3_REGION");
const s3Bucket = Deno.env.get("S3_BUCKET");
const s3AccessKey = Deno.env.get("S3_ACCESS_KEY");
const s3SecretKey = Deno.env.get("S3_SECRET_KEY");
const mongoSrvUrl = Deno.env.get("MONGO_URL");

if (!s3AccessKey || !s3SecretKey || !s3Region || !s3Endpoint || !s3Bucket) {
  throw new Error("Missing an S3 env var!");
}
if (!mongoSrvUrl) {
  throw new Error("Missing mongo env var!");
}

const storage = new S3SessionStore({
  s3AccessKey,
  s3SecretKey,
  s3Region,
  s3Endpoint,
  s3Bucket,
  mongoSrvUrl,
});
await storage.init();

async function handler(req: Request): Promise<Response> {
  const [, path, ...keyParts] = new URL(req.url).pathname.split("/");
  switch (path) {
    case "login": { // POST /token: generates a new login token
      let token: unknown;
      try {
        const json = await req.json();
        token = json.token;
      } catch {
        return new Response("invalid json", { status: 400 });
      }
      return await login(token);
    }
    case "session": {
      const result = await auth(req.headers.get("Authorization"));
      if (!result.ok) return new Response("unauthorized", { status: 401 });
      const id = result.id;
      const key = keyParts.join("/");
      switch (req.method) {
        case "GET": // GET /session: reads session data for key
          return storage.readSession(id, key);
        case "POST": // POST /session: writes session data for key
          return storage.writeSession(id, key, await req.text());
        case "DELETE": // DELETE /session: deletes session data for key
          return storage.deleteSession(id, key);
      }
    }
    // fallthrough
    default:
      return new Response("not found", { status: 404 });
  }
}

await serve(handler, { port: 8080 });
