import { serve } from "https://deno.land/std@0.136.0/http/server.ts";
import { readSession, writeSession } from "./session.ts";
import { auth, login } from "./auth.ts";

async function handler(req: Request): Promise<Response> {
  const path = new URL(req.url).pathname;
  switch (path) {
    case "/login": { // POST /token: generates a new login token
      let token: unknown;
      try {
        const json = await req.json();
        token = json.token;
      } catch {
        return new Response("invalid json", { status: 400 });
      }
      return await login(token);
    }
    case "/session": {
      const result = await auth(req.headers.get("Authorization"));
      if (!result.ok) return new Response("unauthorized", { status: 401 });
      switch (req.method) {
        case "GET": // GET /session: reads session data for key
          return readSession(result.id);
        case "POST": // POST /session: writes session data for key
          return writeSession(result.id, await req.text());
      }
    }
    // fallthrough
    default:
      return new Response("not found", { status: 404 });
  }
}

await serve(handler, { port: 8080 });
