'use client';

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

/** Web Speech API wrapper for journal voice-to-text (browser support varies). */
export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function createSpeechRecognition(onResult: (transcript: string, isFinal: boolean) => void) {
  const w = typeof window !== 'undefined'
    ? (window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
      })
    : null;
  const Ctor = w?.SpeechRecognition || w?.webkitSpeechRecognition;
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += t;
      else interim += t;
    }
    if (final) onResult(final, true);
    else if (interim) onResult(interim, false);
  };

  return recognition;
}
