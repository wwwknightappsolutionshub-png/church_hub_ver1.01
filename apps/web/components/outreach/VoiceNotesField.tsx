'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  readonly results: Iterable<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface VoiceNotesFieldProps {
  value: string;
  onChange: (text: string) => void;
  className?: string;
}

export function VoiceNotesField({ value, onChange, className }: VoiceNotesFieldProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  const toggleListen = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      toast.error('Voice notes are not supported in this browser');
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let transcript = '';
      for (const result of event.results) {
        if (result.isFinal) transcript += result[0].transcript;
      }
      if (transcript.trim()) {
        onChange(value ? `${value} ${transcript.trim()}` : transcript.trim());
      }
    };

    recognition.onerror = () => {
      toast.error('Voice recognition failed');
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    try {
      recognition.start();
      setListening(true);
      toast.info('Listening… tap again to stop');
    } catch {
      toast.error('Could not start microphone');
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <textarea
        className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder="Notes from conversation (type or use voice)…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {supported && (
        <Button
          type="button"
          variant={listening ? 'default' : 'outline'}
          size="sm"
          onClick={toggleListen}
        >
          {listening ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Stop voice
            </>
          ) : (
            <>
              <Mic className="mr-1.5 h-4 w-4" />
              Voice-to-text
            </>
          )}
        </Button>
      )}
      {!supported && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MicOff className="h-3 w-3" />
          Voice-to-text unavailable — type notes manually.
        </p>
      )}
    </div>
  );
}
