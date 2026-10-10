import { computed, ref } from "vue";

type SpeechRecognitionType = new () => SpeechRecognition;

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

  const recognitionSupported = computed(
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const synthesisSupported = computed(() => "speechSynthesis" in window);

  let recognition: SpeechRecognition | null = null;
  let speakId = 0;
  let pendingSpeak: { text: string; id: number } | null = null;

  const preferredNames = ["ava", "zoe", "allison", "samantha", "nicky"];

  function voiceScore(voice: SpeechSynthesisVoice) {
    const name = voice.name.toLowerCase();
    const uri = voice.voiceURI.toLowerCase();
    const lang = voice.lang.toLowerCase().replace("_", "-");
    if (!lang.startsWith("en")) return 0;

    let score = lang === "en-us" ? 40 : 12;
    if (uri.includes("premium") || name.includes("premium")) score += 80;
    else if (uri.includes("enhanced") || name.includes("enhanced")) score += 55;
    if (uri.includes("siri") || name.includes("siri")) score += 25;
    if (uri.includes("eloquence") || name.includes("eloquence") || name.includes("compact")) score -= 30;
    if (name.includes("natural") || name.includes("neural")) score += 35;

    const nameRank = preferredNames.findIndex((item) => name.includes(item));
    if (nameRank >= 0) score += 20 - nameRank;
    return score;
  }

  function bestVoice() {
    const voices = window.speechSynthesis.getVoices();
    let chosen: SpeechSynthesisVoice | null = null;
    let chosenScore = 0;
    for (const voice of voices) {
      const score = voiceScore(voice);
      if (score > chosenScore) {
        chosen = voice;
        chosenScore = score;
      }
    }
    return chosen;
  }

  function playUtterance(text: string, id: number) {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = bestVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "en-US";
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onstart = () => {
      if (id !== speakId) return;
      speaking.value = true;
    };
    utterance.onboundary = (event) => {
      if (id !== speakId || event.name !== "word" || typeof event.charIndex !== "number") return;
      boundarySeen.value = true;
      boundaryIndex.value = event.charIndex;
    };
    utterance.onend = () => {
      if (id !== speakId) return;
      speaking.value = false;
      if (boundarySeen.value) boundaryIndex.value = text.length;
    };
    utterance.onerror = () => {
      if (id !== speakId) return;
      speaking.value = false;
      error.value = "Voice playback failed. You can still read the question and try again.";
    };
    window.speechSynthesis.speak(utterance);
  }

  if (synthesisSupported.value) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      if (!pendingSpeak || pendingSpeak.id !== speakId) return;
      const job = pendingSpeak;
      pendingSpeak = null;
      playUtterance(job.text, job.id);
    });
  }

  function ensureRecognition() {
    if (recognition || !recognitionSupported.value) return;
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) return;
    recognition = new Constructor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const value = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalText += value;
        } else {
          interimText += value;
        }
      }
      if (finalText) transcript.value = `${transcript.value} ${finalText}`.trim();
      interimTranscript.value = interimText.trim();
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        error.value =
          "Microphone permission was denied. Enable mic access in browser settings or use typing mode.";
      } else if (event.error === "no-speech") {
        error.value = "No speech detected. Try speaking again or type your answer.";
      } else {
        error.value = event.error || "Voice recognition failed.";
      }
      listening.value = false;
    };

    recognition.onend = () => {
      listening.value = false;
    };
  }

  function start() {
    error.value = "";
    ensureRecognition();
    if (!recognition) {
      error.value = "Speech recognition is not supported on this device.";
      return;
    }
    try {
      recognition.start();
      listening.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to start microphone.";
      listening.value = false;
    }
  }

  function stop() {
    if (!recognition) return;
    recognition.stop();
    listening.value = false;
  }

  function clearTranscript() {
    transcript.value = "";
    interimTranscript.value = "";
  }

  function speak(text: string) {
    if (!synthesisSupported.value || !text.trim()) return;
    const id = ++speakId;
    error.value = "";
    window.speechSynthesis.cancel();
    spokenText.value = text;
    boundaryIndex.value = 0;
    boundarySeen.value = false;
    if (!window.speechSynthesis.getVoices().length) {
      pendingSpeak = { text, id };
      return;
    }
    pendingSpeak = null;
    playUtterance(text, id);
  }

  function stopSpeaking() {
    if (!synthesisSupported.value) return;
    speakId += 1;
    pendingSpeak = null;
    window.speechSynthesis.cancel();
    speaking.value = false;
  }

  return {
    transcript,
    interimTranscript,
    listening,
    speaking,
    error,
    spokenText,
    boundaryIndex,
    boundarySeen,
    recognitionSupported,
    synthesisSupported,
    start,
    stop,
    clearTranscript,
    speak,
    stopSpeaking
  };
}
