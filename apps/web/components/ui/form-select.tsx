'use client';

import * as React from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

type FlatItem = {
  internal: string;
  realValue: string;
  label: React.ReactNode;
  disabled?: boolean;
  group?: string;
};

function nodeText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (React.isValidElement(node)) return nodeText(node.props.children);
  return '';
}

function collect(children: React.ReactNode, group: string | undefined, out: FlatItem[]) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === React.Fragment) {
      collect(child.props.children, group, out);
      return;
    }
    if (child.type === 'optgroup') {
      const label = String(child.props.label ?? 'Group');
      collect(child.props.children, label, out);
      return;
    }
    if (child.type === 'option') {
      const raw = child.props.value;
      const realValue = raw == null || raw === '' ? (raw === '' ? '' : nodeText(child.props.children).trim()) : String(raw);
      out.push({
        internal: String(out.length),
        realValue,
        label: child.props.children,
        disabled: Boolean(child.props.disabled),
        group,
      });
    }
  });
}

/**
 * Drop-in replacement for a native `<select>`. Options stay as `<option>` / `<optgroup>`
 * children so existing forms keep their values. The open list is the app menu.
 */
export function FormSelect({
  value,
  defaultValue,
  onChange,
  children,
  id,
  className,
  disabled,
  name,
  required,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const items = React.useMemo(() => {
    const out: FlatItem[] = [];
    collect(children, undefined, out);
    return out;
  }, [children]);

  const [uncontrolled, setUncontrolled] = React.useState(() =>
    defaultValue == null ? '' : String(defaultValue),
  );
  const current = value != null ? String(value) : uncontrolled;
  const selected = items.find((item) => item.realValue === current);

  const dataAttrs = Object.fromEntries(
    Object.entries(rest).filter(([key]) => key.startsWith('data-')),
  );

  const emit = (next: string) => {
    if (value == null) setUncontrolled(next);
    onChange?.({
      target: { value: next },
      currentTarget: { value: next },
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  const groups: Array<{ label?: string; items: FlatItem[] }> = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.label === item.group) last.items.push(item);
    else groups.push({ label: item.group, items: [item] });
  }

  return (
    <>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <Select
        value={selected ? selected.internal : undefined}
        onValueChange={(internal) => {
          const item = items.find((row) => row.internal === internal);
          if (item) emit(item.realValue);
        }}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={className}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-required={required || undefined}
          {...dataAttrs}
        >
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group, index) => {
            const body = group.items.map((item) => (
              <SelectItem
                key={item.internal}
                value={item.internal}
                disabled={item.disabled}
              >
                {item.label}
              </SelectItem>
            ));
            if (!group.label) return <React.Fragment key={index}>{body}</React.Fragment>;
            return (
              <SelectGroup key={`${group.label}-${index}`}>
                <SelectLabel>{group.label}</SelectLabel>
                {body}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>
    </>
  );
}
