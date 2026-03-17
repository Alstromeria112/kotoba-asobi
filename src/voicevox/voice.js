import assert from "node:assert/strict";
import child_process from "node:child_process";
import { Readable } from "node:stream";
import util from "node:util";

import ffmpegPath from "ffmpeg-static";

import { getEnv } from "../utils.js";

const apiBaseUrl = getEnv("API_BASE_URL").replace(/\/$/, "");

class VvHttpRequestError extends Error {
  /**
   * @param {`/${string}`} path
   * @param {import("../types.js").VvHttpValidationError["detail"]} detail
   */
  constructor(path, detail) {
    super(`Failed to fetch ${path}:\n${util.inspect(detail, { depth: Infinity })}`);
  }
}
Object.defineProperty(VvHttpRequestError.prototype, "name", {
  value: "VvHttpRequestError",
  writable: true,
  enumerable: false,
  configurable: true,
});

/**
 * @param {string} speaker 話者ID
 * @param {string} text 読み上げたいテキスト
 * @returns {Promise<import("node:stream").Readable>} Opus形式の生データが入ってるstream.Readable
 */
export async function getVoiceData(speaker, text) {
  assert(Number.isInteger(Number(speaker)));
  assert(text.length > 0);
  // https://github.com/VOICEVOX/voicevox_engine#http-%E3%83%AA%E3%82%AF%E3%82%A8%E3%82%B9%E3%83%88%E3%81%A7%E9%9F%B3%E5%A3%B0%E5%90%88%E6%88%90%E3%81%99%E3%82%8B%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB%E3%82%B3%E3%83%BC%E3%83%89
  /** @type {string} */
  let query;
  {
    const params = new URLSearchParams({ speaker, text });
    const res = await fetch(`${apiBaseUrl}/audio_query?${params}`, {
      method: "POST",
    });
    if (!res.ok) {
      // TODO: error handling?
      /** @type {import("../types.js").VvHttpValidationError} */
      const { detail } = await res.json();
      throw new VvHttpRequestError("/audio_query", detail);
    }
    query = await res.text();
  }
  const res = await fetch(`${apiBaseUrl}/synthesis?speaker=${speaker}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: query,
  });
  if (!res.ok) {
    // TODO: error handling?
    /** @type {import("../types.js").VvHttpValidationError} */
    const { detail } = await res.json();
    throw new VvHttpRequestError("/synthesis", detail);
  }
  assert(res.body);
  const child = child_process.spawn(
    /** @type {string} */ (/** @type {unknown} */ (ffmpegPath)),
    ["-f", "wav", "-i", "pipe:0", "-f", "opus", "-ar", "48000", "pipe:1"],
    { stdio: ["pipe", "pipe", "ignore"] },
  );
  // @ts-ignore ts(2345): ReadableStreamの型が違うと怒られる 動くのに
  Readable.fromWeb(res.body).pipe(child.stdin);
  return child.stdout;
}
