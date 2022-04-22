#!/usr/bin/env deno
import { exportKey, generateKey } from "./src/crypto.ts";
console.log(await exportKey(await generateKey()));
