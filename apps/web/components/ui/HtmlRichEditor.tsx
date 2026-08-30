'use client';

import { useCallback, useEffect, useRef } from 'react';
import { AlignLeft, Bold, Italic, Link2, List, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HtmlRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  testId?: string;
}

export function HtmlRichEditor({
  value,
  onChange,
  placeholder = 'Edit content…',
  className,
  minHeight = 'min-h-[280px]',
  testId = 'html-rich-editor',
}: HtmlRichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.innerHTML === value) return;
    el.innerHTML = value || '';
  }, [value]);

  const sync = useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange]);

  const exec = (cmd: string, valueArg?: string) => {
    document.execCommand(cmd, false, valueArg);
    ref.current?.focus();
    sync();
  };

  const insertLink = () => {
    const url = window.prompt('Link URL');
    if (url) exec('createLink', url);
  };

  return (
    <div
      className={cn('max-w-full overflow-hidden rounded-md border border-input', className)}
      data-testid={testId}
    >
      <div className="flex flex-wrap gap-0.5 border-b bg-muted/30 p-1">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => exec('bold')}>
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => exec('italic')}>
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => exec('insertUnorderedList')}>
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => exec('insertOrderedList')}>
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={insertLink}>
          <Link2 className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => exec('removeFormat')}>
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div
        ref={ref}
        role="textbox"
        contentEditable
        suppressContentEditableWarning
        className={cn(
          'max-w-full overflow-x-auto px-3 py-2 text-sm leading-relaxed outline-none',
          '[&_table]:max-w-full [&_table]:w-full',
          '[&_img]:h-auto [&_img]:max-w-full',
          '[&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)]',
          minHeight,
        )}
        data-placeholder={placeholder}
        onInput={sync}
        onBlur={sync}
      />
    </div>
  );
}
