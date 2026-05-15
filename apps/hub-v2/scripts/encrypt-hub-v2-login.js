#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const readline = require("node:readline");

const LOGIN_AES_KEY_SALT = "ngm_hub_v2_login_key_v1";
const LOGIN_AES_IV_SALT = "ngm_hub_v2_login_iv_v1";

function printUsage() {
  console.log(`Usage:
  node ./scripts/encrypt-hub-v2-login.js --username <username> --nonce <nonce> --password <password>
  HUB_V2_LOGIN_USERNAME=<username> NONCE=<nonce> PASSWORD=<password> npm run auth:encrypt-login

Example:
  node ./scripts/encrypt-hub-v2-login.js --username zhangjing --nonce 12345678-1234-1234-1234-123456789abc --password your-password
  $env:HUB_V2_LOGIN_USERNAME="zhangjing"; $env:NONCE="12345678-1234-1234-1234-123456789abc"; $env:PASSWORD="your-password"; npm run auth:encrypt-login
`);
}

function parseArgs(argv) {
  const result = {
    username: "",
    nonce: "",
    password: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];
    const [flag, inlineValue] = current.split("=", 2);

    if (flag === "--username") {
      result.username = (inlineValue ?? next ?? "").trim();
      if (inlineValue === undefined) {
        index += 1;
      }
      continue;
    }
    if (flag === "--nonce") {
      result.nonce = (inlineValue ?? next ?? "").trim();
      if (inlineValue === undefined) {
        index += 1;
      }
      continue;
    }
    if (flag === "--password") {
      result.password = inlineValue ?? next ?? "";
      if (inlineValue === undefined) {
        index += 1;
      }
      continue;
    }
    if (current === "--username") {
      result.username = (next ?? "").trim();
      index += 1;
      continue;
    }
    if (current === "--nonce") {
      result.nonce = (next ?? "").trim();
      index += 1;
      continue;
    }
    if (current === "--password") {
      result.password = next ?? "";
      index += 1;
      continue;
    }
    if (current === "--help" || current === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  return result;
}

function encryptLoginPassword(nonce, password) {
  const key = crypto.createHash("sha256").update(`${nonce}:${LOGIN_AES_KEY_SALT}`).digest();
  const iv = crypto.createHash("sha256").update(`${nonce}:${LOGIN_AES_IV_SALT}`).digest().subarray(0, 16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const plain = `${nonce}:${password}`;
  return Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]).toString("base64");
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function resolveNonce(initialNonce) {
  if (initialNonce) {
    return initialNonce;
  }

  const answer = await prompt("Please input login nonce: ");
  return answer.trim();
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const username = parsed.username || process.env.HUB_V2_LOGIN_USERNAME || process.env.npm_config_username || "";
  const password = parsed.password || process.env.PASSWORD || process.env.npm_config_password || "";
  if (!username || !password) {
    printUsage();
    process.exit(1);
  }

  const nonce = await resolveNonce(parsed.nonce || process.env.NONCE || process.env.npm_config_nonce || "");
  if (!nonce) {
    printUsage();
    process.exit(1);
  }

  const cipherText = encryptLoginPassword(nonce, password);
  console.log(
    JSON.stringify(
      {
        username,
        nonce,
        cipherText
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
