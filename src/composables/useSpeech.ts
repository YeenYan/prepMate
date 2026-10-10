import { computed, ref } from "vue";

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionType = new () => SpeechRecognition;

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
let unlockAudio: HTMLAudioElement | null = null;

export function unlockInterviewAudio() {
  if (typeof Audio === "undefined") return;
  if (!unlockAudio) unlockAudio = new Audio(SILENT_WAV);
  unlockAudio.play().catch(() => undefined);
}

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionType;
    SpeechRecognition?: SpeechRecognitionType;
  }
}

export function useSpeech() {
  const transcript = ref("");
  const interimTranscript = ref("");
  const listening = ref(false);
  const speaking = ref(false);
  const error = ref("");
  const spokenText = ref("");
  const boundaryIndex = ref(0);
  const boundarySeen = ref(false);
  const preparing = ref(false);

  const recognitionSupported = computed(
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  let recognition: SpeechRecognition | null = null;
  let keepListening = false;
  let sessionBase = "";
  let sessionFinal = "";
  let restartTimer = 0;
  let restartAttempts = 0;
  let speakId = 0;
  let audio: HTMLAudioElement | null = null;
  let objectUrl = "";
  let highlightFrame = 0;
  let speakAbort: AbortController | null = null;

  interface SpeechAlignment {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  }

  const audioCache = new Map<string, { blob: Blob; alignment: SpeechAlignment | null }>();

  function stopAudio() {
    if (highlightFrame) cancelAnimationFrame(highlightFrame);
    highlightFrame = 0;
    if (audio) {
      audio.pause();
      audio.src = "";
      audio = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = "";
    }
  }

  function indexAtTime(alignment: SpeechAlignment, time: number) {
    const starts = alignment.character_start_times_seconds;
    let index = 0;
    for (let i = 0; i < starts.length; i += 1) {
      if (starts[i] <= time) index = i;
      else break;
    }
    return index;
  }

  function trackHighlight(id: number, element: HTMLAudioElement, alignment: SpeechAlignment | null) {
    const tick = () => {
      if (id !== speakId || !audio) return;
      if (alignment) {
        const index = indexAtTime(alignment, element.currentTime);
        if (boundaryIndex.value !== index) boundaryIndex.value = index;
        if (!boundarySeen.value) boundarySeen.value = true;
      }
      if (!element.paused && !element.ended) highlightFrame = requestAnimationFrame(tick);
    };
    highlightFrame = requestAnimationFrame(tick);
  }

  async function playClip(text: string, id: number, clip: { blob: Blob; alignment: SpeechAlignment | null }) {
    if (id !== speakId) return;
    objectUrl = URL.createObjectURL(clip.blob);
    const element = new Audio(objectUrl);
    element.setAttribute("playsinline", "true");
    element.setAttribute("webkit-playsinline", "true");
    audio = element;
    element.onplaying = () => {
      if (id !== speakId) return;
      preparing.value = false;
      speaking.value = true;
      trackHighlight(id, element, clip.alignment);
    };
    element.onended = () => {
      if (id !== speakId) return;
      speaking.value = false;
      preparing.value = false;
      if (clip.alignment) boundaryIndex.value = text.length;
    };
    element.onerror = () => {
      if (id !== speakId) return;
      speaking.value = false;
      preparing.value = false;
      error.value = "Voice playback failed. You can still read the question and try again.";
    };
    try {
      await element.play();
    } catch {
      if (id !== speakId) return;
      speaking.value = false;
      preparing.value = false;
      error.value = "Tap replay to hear the question.";
    }
  }

  function joinText(...parts: string[]) {
    return parts
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function bestTranscript(result: SpeechRecognitionResult) {
    let best = result[0];
    for (let i = 1; i < result.length; i += 1) {
      const alternative = result[i];
      if (!alternative) continue;
      if ((alternative.confidence || 0) > (best?.confidence || 0)) best = alternative;
    }
    return (best?.transcript || "").replace(/\s+/g, " ").trim();
  }

  function commitSession() {
    const combined = joinText(sessionBase, sessionFinal, interimTranscript.value);
    sessionBase = combined;
    sessionFinal = "";
    transcript.value = combined;
    interimTranscript.value = "";
  }

  function handleResult(event: SpeechRecognitionEvent) {
    restartAttempts = 0;
    let finalText = "";
    let interimText = "";
    for (let i = 0; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (!result) continue;
      const value = bestTranscript(result);
      if (!value) continue;
      if (result.isFinal) finalText = joinText(finalText, value);
      else interimText = joinText(interimText, value);
    }
    sessionFinal = finalText;
    transcript.value = joinText(sessionBase, sessionFinal);
    interimTranscript.value = interimText;
  }

  function handleError(event: SpeechRecognitionErrorEvent) {
    if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "audio-capture") {
      keepListening = false;
      listening.value = false;
      error.value =
        event.error === "audio-capture"
          ? "No microphone was found. You can type your answer instead."
          : "Microphone permission was denied. Enable mic access in browser settings or use typing mode.";
      return;
    }
    if (keepListening) return;
    if (event.error !== "aborted" && event.error !== "no-speech") {
      error.value = event.error || "Voice recognition failed.";
    }
  }

  function scheduleRestart() {
    window.clearTimeout(restartTimer);
    restartTimer = window.setTimeout(() => {
      if (!keepListening) return;
      const next = createRecognition();
      if (!next) return;
      recognition = next;
      try {
        next.start();
        restartAttempts = 0;
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (/already started/i.test(message)) return;
        restartAttempts += 1;
        if (restartAttempts < 8) scheduleRestart();
        else {
          keepListening = false;
          listening.value = false;
          error.value = "The microphone stopped. Tap it to continue your answer.";
        }
      }
    }, 300);
  }

  function handleEnd() {
    commitSession();
    if (!keepListening) {
      listening.value = false;
      return;
    }
    scheduleRestart();
  }

  function createRecognition() {
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) return null;
    const next = new Constructor();
    next.lang = "en-US";
    next.interimResults = true;
    next.continuous = true;
    next.maxAlternatives = 3;
    next.onresult = handleResult;
    next.onerror = handleError;
    next.onend = handleEnd;
    return next;
  }

  function start() {
    error.value = "";
    keepListening = true;
    window.clearTimeout(restartTimer);
    recognition = createRecognition();
    if (!recognition) {
      error.value = "Speech recognition is not supported on this device.";
      keepListening = false;
      return;
    }
    try {
      recognition.start();
      listening.value = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/already started/i.test(message)) {
        listening.value = true;
        return;
      }
      error.value = message || "Failed to start microphone.";
      keepListening = false;
      listening.value = false;
    }
  }

  function stop() {
    keepListening = false;
    window.clearTimeout(restartTimer);
    commitSession();
    try {
      recognition?.stop();
    } catch {
      listening.value = false;
    }
    listening.value = false;
  }

  function clearTranscript() {
    sessionBase = "";
    sessionFinal = "";
    transcript.value = "";
    interimTranscript.value = "";
  }

  async function speak(text: string) {
    const spoken = text.trim();
    if (!spoken) return;
    speakAbort?.abort();
    stopAudio();
    const id = ++speakId;
    const controller = new AbortController();
    speakAbort = controller;
    error.value = "";
    spokenText.value = spoken;
    boundaryIndex.value = 0;
    boundarySeen.value = false;
    speaking.value = false;
    preparing.value = true;

    try {
      let clip = audioCache.get(spoken);
      if (!clip) {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: spoken }),
          cache: "no-store",
          signal: controller.signal
        });
        if (id !== speakId) return;
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (id !== speakId) return;
        const isWav =
          bytes.length > 12 &&
          bytes[0] === 82 &&
          bytes[1] === 73 &&
          bytes[2] === 70 &&
          bytes[3] === 70;
        if (!response.ok || !isWav) {
          let message = "Could not generate the interviewer voice.";
          try {
            const data = JSON.parse(new TextDecoder().decode(bytes)) as { error?: string };
            if (data?.error) message = data.error;
          } catch {
            message = "Could not generate the interviewer voice.";
          }
          preparing.value = false;
          error.value = message;
          return;
        }
        clip = { blob: new Blob([bytes], { type: "audio/wav" }), alignment: null };
        audioCache.set(spoken, clip);
      }
      await playClip(spoken, id, clip);
    } catch (err) {
      if (id !== speakId || (err instanceof DOMException && err.name === "AbortError")) return;
      preparing.value = false;
      speaking.value = false;
      error.value = "Could not generate the interviewer voice.";
    }
  }

  function stopSpeaking() {
    speakId += 1;
    speakAbort?.abort();
    stopAudio();
    preparing.value = false;
    speaking.value = false;
  }

  return {
    transcript,
    interimTranscript,
    listening,
    speaking,
    preparing,
    error,
    spokenText,
    boundaryIndex,
    boundarySeen,
    recognitionSupported,
    start,
    stop,
    clearTranscript,
    speak,
    stopSpeaking
  };
}
