import path from "node:path";
import readline from "node:readline";
import { env, RawAudio } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const VOICE = "af_heart";

env.cacheDir = path.join(process.cwd(), ".cache", "kokoro");

const queued = [];
let waitForLine = null;
const lines = readline.createInterface({ input: process.stdin });
lines.on("line", (line) => {
  if (waitForLine) {
    const resolve = waitForLine;
    waitForLine = null;
    resolve(line);
    return;
  }
  queued.push(line);
});

function nextLine() {
  const line = queued.shift();
  if (line !== undefined) return Promise.resolve(line);
  return new Promise((resolve) => {
    waitForLine = resolve;
  });
}

const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
  dtype: "q8",
  device: "cpu"
});

function sentences(text) {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.length > 0 ? parts : [text];
}

async function synthesize(text) {
  const chunks = [];
  let sampleRate = 24000;
  for (const sentence of sentences(text)) {
    const audio = await tts.generate(sentence, { voice: VOICE, speed: 1 });
    if (audio.audio.length === 0) continue;
    chunks.push(audio.audio);
    sampleRate = audio.sampling_rate;
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (total === 0) return "";
  const samples = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }
  return Buffer.from(new RawAudio(samples, sampleRate).toWav()).toString("base64");
}

while (true) {
  const line = await nextLine();
  const trimmed = line.trim();
  if (!trimmed) continue;
  try {
    const payload = JSON.parse(trimmed);
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!text) throw new Error("The question text could not be spoken.");
    const audioBase64 = await synthesize(text);
    if (!audioBase64) throw new Error("Could not generate the interviewer voice.");
    process.stdout.write(`${JSON.stringify({ audioBase64 })}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate the interviewer voice.";
    process.stdout.write(`${JSON.stringify({ error: message.slice(0, 160) })}\n`);
  }
}
