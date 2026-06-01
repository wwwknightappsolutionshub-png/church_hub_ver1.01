'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DevotionalJournalRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function DevotionalJournalRichEditor({
  value,
  onChange,
  placeholder = 'Write your reflection…',
  className,
}: DevotionalJournalRichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.innerHTML === value) return;
    el.innerHTML = value || '';
  }, [value]);

  const sync = useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange]);

  const exec = (cmd: string) => {
    document.execCommand(cmd, false);
    ref.current?.focus();
    sync();
  };

  return (
    <div className={cn('rounded-md border border-input', className)}>
      <div className="flex flex-wrap gap-0.5 border-b bg-muted/30 p-1">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => exec('bold')}>
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => exec('italic')}>
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => exec('insertUnorderedList')}
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => exec('insertOrderedList')}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div
        ref={ref}
        role="textbox"
        contentEditable
        suppressContentEditableWarning
        className="min-h-[140px] px-3 py-2 text-sm leading-relaxed outline-none [&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)]"
        data-placeholder={placeholder}
        onInput={sync}
        onBlur={sync}
      />
    </div>
  );
}
