import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { r2, BUCKET_NAME } from "@/libs/r2";

export const runtime = "nodejs";

async function getParams(params) {
  return params && typeof params.then === "function" ? await params : params;
}

function toKey(param) {
  const segments = Array.isArray(param) ? param : [param];
  const key = segments.map((s) => decodeURIComponent(String(s))).join("/");

  // Basic hardening: avoid path traversal patterns.
  if (!key || key.includes("..")) {
    throw new Error("Invalid key");
  }

  return key;
}

function cacheHeaders() {
  // Assets are content-addressed by filename (timestamp prefix), so immutable caching is safe.
  return "public, max-age=31536000, immutable";
}

export async function HEAD(_req, { params }) {
  try {
    const resolved = await getParams(params);
    const key = toKey(resolved?.key);
    const out = await r2.send(
      new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
    );

    const headers = new Headers();
    headers.set("Cache-Control", cacheHeaders());
    if (out.ContentType) headers.set("Content-Type", out.ContentType);
    if (out.ContentLength != null)
      headers.set("Content-Length", String(out.ContentLength));
    if (out.ETag) headers.set("ETag", out.ETag);
    return new Response(null, { status: 200, headers });
  } catch (err) {
    return new Response("Not found", { status: 404 });
  }
}

export async function GET(_req, { params }) {
  try {
    const resolved = await getParams(params);
    const key = toKey(resolved?.key);
    const out = await r2.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
    );

    const headers = new Headers();
    headers.set("Cache-Control", cacheHeaders());
    if (out.ContentType) headers.set("Content-Type", out.ContentType);
    if (out.ContentLength != null)
      headers.set("Content-Length", String(out.ContentLength));
    if (out.ETag) headers.set("ETag", out.ETag);

    const body =
      out.Body && typeof out.Body === "object"
        ? Readable.toWeb(out.Body)
        : null;

    return new Response(body, { status: 200, headers });
  } catch (err) {
    return new Response("Not found", { status: 404 });
  }
}
