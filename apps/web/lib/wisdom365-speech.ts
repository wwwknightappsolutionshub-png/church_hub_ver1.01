'use client';

let speaking = false;

export function isWisdom365Speaking(): boolean {
  return speaking;
}

export function stopWisdom365Speech() {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  speaking = false;
}

export function speakWisdom365(
  script: string,
  opts?: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    opts?.onError?.();
    return false;
  }

  stopWisdom365Speech();
  const utterance = new SpeechSynthesisUtterance(script);
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0];
  if (preferred) utterance.voice = preferred;

  utterance.onstart = () => {
    speaking = true;
    opts?.onStart?.();
  };
  utterance.onend = () => {
    speaking = false;
    opts?.onEnd?.();
  };
  utterance.onerror = () => {
    speaking = false;
    opts?.onError?.();
  };

  window.speechSynthesis.speak(utterance);
  return true;
}

export function preloadSpeechVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.getVoices();
}
