'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Loader2, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  readonly results: ArrayLike<SpeechRecognitionResultLike> & {
    [Symbol.iterator](): Iterator<SpeechRecognitionResultLike>;
  };
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

type FieldMode = 'replace' | 'append';

type SpeakableFieldBase = {
  value: string;
  onChange: (value: string) => void;
  /** replace = set field from speech; append = add to existing (notes). */
  mode?: FieldMode;
  /** Optional cleanup of transcript before applying (e.g. phone digits). */
  transformTranscript?: (transcript: string) => string;
  className?: string;
  controlClassName?: string;
};

type SpeakableInputProps = SpeakableFieldBase &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'className'> & {
    as?: 'input';
  };

type SpeakableTextareaProps = SpeakableFieldBase &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'className'> & {
    as: 'textarea';
  };

export type SpeakableFieldProps = SpeakableInputProps | SpeakableTextareaProps;

export const SpeakableField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  SpeakableFieldProps
>(function SpeakableField(props, ref) {
  const {
    value,
    onChange,
    mode = 'replace',
    transformTranscript,
    className,
    controlClassName,
    as = 'input',
    onFocus,
    onBlur,
    ...rest
  } = props;

  const [supported, setSupported] = useState(false);
  const [focused, setFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);
  const micLabelId = useId();

  valueRef.current = value;

  useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const showMic = supported && (focused || listening);

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  };

  const toggleListen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      toast.error('Voice-to-text is not supported in this browser');
      return;
    }

    if (listening) {
      stopListening();
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = mode === 'append';
    recognition.interimResults = false;
    recognition.lang = 'en-GB';
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let transcript = '';
      for (const result of event.results) {
        if (result.isFinal) transcript += result[0].transcript;
      }
      let next = transcript.trim();
      if (!next) return;
      if (transformTranscript) next = transformTranscript(next);
      if (!next) return;
      if (mode === 'append') {
        const cur = valueRef.current.trim();
        onChange(cur ? `${cur} ${next}` : next);
      } else {
        onChange(next);
      }
    };

    recognition.onerror = () => {
      toast.error('Voice recognition failed');
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      setListening(true);
      toast.info('Listening… tap the mic again to stop');
    } catch {
      toast.error('Could not start microphone');
      setListening(false);
    }
  };

  const controlPad = showMic ? 'pr-11' : undefined;

  return (
    <div className={cn('relative', className)}>
      {as === 'textarea' ? (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e as never);
          }}
          onBlur={(e) => {
            // Keep mic visible if moving focus to the mic button
            const next = e.relatedTarget as HTMLElement | null;
            if (next?.dataset?.speakableMic === 'true') return;
            setFocused(false);
            onBlur?.(e as never);
          }}
          className={cn(
            'min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            controlPad,
            controlClassName,
          )}
        />
      ) : (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e as never);
          }}
          onBlur={(e) => {
            const next = e.relatedTarget as HTMLElement | null;
            if (next?.dataset?.speakableMic === 'true') return;
            setFocused(false);
            onBlur?.(e as never);
          }}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            controlPad,
            controlClassName,
          )}
        />
      )}

      {showMic ? (
        <button
          type="button"
          data-speakable-mic="true"
          id={micLabelId}
          aria-label={listening ? 'Stop voice input' : 'Voice to text'}
          aria-pressed={listening}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleListen}
          className={cn(
            'absolute right-1.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition',
            as === 'textarea' && 'top-3 translate-y-0',
            listening
              ? 'border-primary bg-primary text-primary-foreground'
              : 'hover:bg-muted',
          )}
        >
          {listening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
        </button>
      ) : null}

      {!supported && as === 'textarea' ? (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
          <MicOff className="h-3 w-3" />
          Voice-to-text unavailable — type instead.
        </p>
      ) : null}
    </div>
  );
});
