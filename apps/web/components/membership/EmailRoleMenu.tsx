'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoleLink {
  role: string;
  href: string;
}

interface EmailRoleMenuProps {
  label: string;
  testId: string;
  allHref?: string;
  allLabel?: string;
  byRole: RoleLink[];
}

export function EmailRoleMenu({ label, testId, allHref, allLabel, byRole }: EmailRoleMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const hasItems = Boolean(allHref) || byRole.length > 0;
  if (!hasItems) return null;

  return (
    <div className="relative" ref={rootRef}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        data-testid={testId}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Mail className="mr-1.5 h-4 w-4" />
        {label}
        <ChevronDown className="ml-1 h-3 w-3" />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-md border border-border bg-popover py-1 shadow-lg"
        >
          {allHref ? (
            <a
              role="menuitem"
              href={allHref}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 text-sm hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              {allLabel ?? `All congregants (${label})`}
            </a>
          ) : null}
          {byRole.map((row) => (
            <a
              key={row.role}
              role="menuitem"
              href={row.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 text-sm hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              {row.role}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
