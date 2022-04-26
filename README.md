# <h1 align="center">grammY Free Sessions</h1>

---

## Introduction

This repo contains the backend setup which powers grammY's free sessions.
It is hosted on Deno Deploy.

Bots can authenticate themselves using their bot token on the `/login` endpoint.
In turn, they will receive a JWT which contains their bot identifier.

When reading or writing session data via the `/session` endpoint, the bot sends this token in a header.
We can use it to identify the bot and perform the respective action.

Session data is stored in an S3 bucket.

We enforce hard limits on the storage space that a bot can consume.

- Session keys each max 64 UTF-16 code units
- Session data per key max 16 KiB
- Max 50K sessions

We keep track of the session keys for each bot in a MongoDB database.

## Development

If you want to run this project locally, you can simply execute `deno run src/main.ts`.

You will need to set a number of environment variables for this project to function.

1. Generate a secret key by running `deno run genkey.ts`.
   Store it in the environment variable `SECRET_KEY`, e.g. using `SECRET_KEY="$(deno run genkey.ts)"`.
2. Create an S3 bucket at any S3-compatible hosting provider of your choice.
   You should now have those values for your S3 bucket:
   - A URL endpoint, must be stored in `S3_ENDPOINT`.
   - A region name, must be stored in `S3_REGION`.
   - A bucket name, must be stored in `S3_BUCKET`.
   - An access key, must be stored in `S3_ACCESS_KEY`.
   - A secret key, must be stored in `S3_SECRET_KEY`.
3. Create a MongoDB database at any hosting provider of your choice.
   Store the srv string in `MONGO_URL`.

See the `.env.example` file, too.
