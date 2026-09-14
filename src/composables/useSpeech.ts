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

  const recognitionSupported = computed(
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const synthesisSupported = computed(() => "speechSynthesis" in window);

  let recognition: SpeechRecognition | null = null;

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
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.onstart = () => {
      speaking.value = true;
    };
    utterance.onend = () => {
      speaking.value = false;
    };
    utterance.onerror = () => {
      speaking.value = false;
    };
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (!synthesisSupported.value) return;
    window.speechSynthesis.cancel();
    speaking.value = false;
  }

  return {
    transcript,
    interimTranscript,
    listening,
    speaking,
    error,
    recognitionSupported,
    synthesisSupported,
    start,
    stop,
    clearTranscript,
    speak,
    stopSpeaking
  };
}
