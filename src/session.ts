import { copy } from "https://deno.land/std@0.136.0/bytes/mod.ts";
import { S3, S3Bucket } from "https://deno.land/x/s3@0.5.0/mod.ts";

// hard storage limits
const MAX_SESSION_KEY_LENGTH = 64; // UTF-16 code units
const MAX_SESSION_DATA_BYTES = 16 * 1024; // max 16 KiB per session
const MAX_SESSION_COUNT = 50_000; // max 50,000 sessions per bot

import {
  type Collection,
  MongoClient,
} from "https://deno.land/x/mongo@v0.29.4/mod.ts";

interface StoreConfig {
  s3AccessKey: string;
  s3SecretKey: string;
  s3Region: string;
  s3Endpoint: string;
  s3Bucket: string;
  mongoSrvUrl: string;
}

interface BotStats {
  keys: string[];
}

export class S3SessionStore {
  private stats: Collection<BotStats> | undefined;
  private readonly bucket: S3Bucket;

  constructor(private readonly config: StoreConfig) {
    const s3 = new S3({
      accessKeyID: config.s3AccessKey,
      secretKey: config.s3SecretKey,
      region: config.s3Region,
      endpointURL: config.s3Endpoint,
    });
    this.bucket = s3.getBucket(config.s3Bucket);
  }

  async init() {
    const client = new MongoClient();
    const database = await client.connect(this.config.mongoSrvUrl);
    this.stats = database.collection("session");
  }

  private key(id: number, key: string) {
    return `bot${id}/${key}`;
  }

  private async get(key: string) {
    const response = await this.bucket.getObject(key);
    if (response === undefined) return undefined;
    return await readCapped(response.body);
  }

  private async put(key: string, data: Uint8Array) {
    await this.bucket.putObject(key, data);
  }

  private async delete(key: string) {
    await this.bucket.deleteObject(key);
  }

  async readSession(id: number, key: string) {
    const session = await this.get(this.key(id, key));
    return session === undefined
      ? new Response(null, { status: 404 })
      : new Response(session, { status: 200 });
  }

  async writeSession(
    id: number,
    key: string,
    stream: ReadableStream<Uint8Array>,
  ) {
    if (this.stats === undefined) throw new Error("not inited");
    if (key.length >= MAX_SESSION_KEY_LENGTH) {
      return new Response(`key lengths exceeds ${MAX_SESSION_KEY_LENGTH}`, {
        status: 400,
      });
    }
    const data = await readCapped(stream, MAX_SESSION_DATA_BYTES);
    if (data === undefined) {
      return new Response(`data exceeds ${MAX_SESSION_DATA_BYTES} bytes`, {
        status: 400,
      });
    }
    const _id = id.toString();
    // We store one document per bot, containing an array withouth duplicates
    // for all session keys. Every session write is recorded here. The only way
    // how the following query can not match any document is if the maximum
    // number of allowed session keys is reached for the given bot. Hence, we
    // use the `matchedCount` to determine if there is free space for the bot,
    // and a write is permitted.
    const { matchedCount } = await this.stats.updateOne(
      { _id, [`keys.${MAX_SESSION_COUNT - 1}`]: { $exists: false } },
      { $addToSet: { keys: key } },
      { upsert: true },
    );
    const canWrite = matchedCount > 0;
    if (!canWrite) {
      return new Response("max session count reached", { status: 409 });
    }
    await this.put(this.key(id, key), data);
    return new Response(null, { status: 204 });
  }

  async deleteSession(id: number, key: string) {
    if (this.stats === undefined) throw new Error("not inited");
    const _id = id.toString();
    await Promise.all([
      this.stats.updateOne({ _id }, { $pull: { keys: key } }),
      this.delete(this.key(id, key)),
    ]);
    return new Response(null, { status: 204 });
  }
}

async function readCapped(
  stream: ReadableStream<Uint8Array>,
  maxBytes = Infinity,
): Promise<Uint8Array | undefined> {
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    bytes += chunk.byteLength;
    if (bytes >= maxBytes) return undefined;
    else chunks.push(chunk);
  }
  return join(chunks, bytes);
}

function join(chunks: Uint8Array[], bytes: number) {
  let off = 0;
  const buf = new Uint8Array(bytes);
  for (const chunk of chunks) off += copy(chunk, buf, off);
  return buf;
}
