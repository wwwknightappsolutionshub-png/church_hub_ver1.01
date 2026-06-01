'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
} from '@/lib/devotional-journal-voice';

type VoiceToTextareaProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
};

export function VoiceToTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 5,
  disabled,
  className,
}: VoiceToTextareaProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition>>(null);

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleVoice = () => {
    if (!supported) {
      toast.error('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }

    const recognition = createSpeechRecognition((text, isFinal) => {
      if (!text.trim()) return;
      if (isFinal) {
        onChange(value.trim() ? `${value.trim()} ${text.trim()}` : text.trim());
      }
    });

    if (!recognition) {
      toast.error('Could not start voice recognition');
      return;
    }

    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      toast.error('Voice input stopped — check microphone permissions');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    toast.message('Listening… speak clearly, then tap Stop');
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={listening ? 'destructive' : 'outline'}
          size="sm"
          disabled={disabled}
          onClick={toggleVoice}
        >
          {listening ? (
            <>
              <MicOff className="mr-2 h-4 w-4" />
              Stop voice
            </>
          ) : (
            <>
              <Mic className="mr-2 h-4 w-4" />
              Voice to text
            </>
          )}
        </Button>
        {listening ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Recording…
          </span>
        ) : supported ? (
          <span className="text-xs text-muted-foreground">
            Add context by speaking or typing — used when generating the devotional.
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Type your notes (voice not supported here).</span>
        )}
      </div>
    </div>
  );
}
