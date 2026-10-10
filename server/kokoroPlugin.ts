import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";

const SCRIPT = path.join(process.cwd(), "server", "kokoroSpeak.mjs");

interface SpeechResult {
  audioBase64?: string;
  error?: string;
}

interface SpeechJob {
  text: string;
  resolve: (result: SpeechResult) => void;
  timer?: ReturnType<typeof setTimeout>;
}

let worker: ChildProcessWithoutNullStreams | null = null;
let active: SpeechJob | null = null;
let buffer = "";
const queue: SpeechJob[] = [];

function stopWorker() {
  const current = worker;
  worker = null;
  buffer = "";
  const leftover = active ? [active, ...queue.splice(0)] : queue.splice(0);
  active = null;
  for (const job of leftover) {
    if (job.timer) clearTimeout(job.timer);
    job.resolve({ error: "Could not generate the interviewer voice." });
  }
  if (current && current.exitCode === null) current.kill();
}

function finishActive(result: SpeechResult) {
  const job = active;
  active = null;
  if (!job) return;
  if (job.timer) clearTimeout(job.timer);
  job.resolve(result);
  pump();
}

function flush() {
  const newline = buffer.indexOf("\n");
  if (newline < 0 || !active) return;
  const line = buffer.slice(0, newline);
  buffer = buffer.slice(newline + 1);
  try {
    finishActive(JSON.parse(line) as SpeechResult);
  } catch {
    finishActive({ error: "Could not generate the interviewer voice." });
  }
}

function ensureWorker() {
  if (worker && worker.exitCode === null) return worker;
  const child = spawn(process.execPath, [SCRIPT], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"]
  });
  worker = child;
  buffer = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    buffer += chunk;
    flush();
  });
  child.on("error", () => {
    if (worker === child) worker = null;
    if (active || queue.length > 0) stopWorker();
  });
  child.on("exit", () => {
    if (worker === child) worker = null;
    if (active || queue.length > 0) stopWorker();
  });
  return child;
}

function pump() {
  if (active || queue.length === 0) return;
  const job = queue.shift();
  if (!job) return;
  active = job;
  job.timer = setTimeout(() => {
    if (active === job) stopWorker();
  }, 120_000);
  const child = ensureWorker();
  child.stdin.write(`${JSON.stringify({ text: job.text })}\n`);
  flush();
}

function synthesize(text: string) {
  return new Promise<SpeechResult>((resolve) => {
    queue.push({ text, resolve });
    pump();
  });
}

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer | string) => {
      const bufferChunk = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      size += bufferChunk.length;
      if (size > 100_000) {
        reject(new Error("too-large"));
        req.destroy();
        return;
      }
      chunks.push(bufferChunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function attach(middlewares: Connect.Server) {
  middlewares.use((req, res, next) => {
    const requestPath = req.url?.split("?")[0];
    if (requestPath !== "/api/tts" || req.method !== "POST") {
      next();
      return;
    }
    void handle(req, res);
  });
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  try {
    const raw = await readBody(req);
    const payload = JSON.parse(raw) as { text?: unknown };
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!text || text.length > 4000) {
      sendJson(res, 400, { error: "The question text could not be spoken." });
      return;
    }

    const result = await synthesize(text);
    if (!result.audioBase64) {
      sendJson(res, 500, { error: result.error || "Could not generate the interviewer voice." });
      return;
    }
    sendJson(res, 200, { audioBase64: result.audioBase64, mimeType: "audio/wav", alignment: null });
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && error.message === "too-large")) {
      sendJson(res, 400, { error: "The question text could not be spoken." });
      return;
    }
    const message = error instanceof Error ? error.message : "Could not generate the interviewer voice.";
    sendJson(res, 500, { error: message.slice(0, 160) });
  }
}

export function kokoroPlugin(): Plugin {
  return {
    name: "kokoro-tts",
    configureServer(server) {
      attach(server.middlewares);
      server.httpServer?.once("close", stopWorker);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
      server.httpServer?.once("close", stopWorker);
    }
  };
}
