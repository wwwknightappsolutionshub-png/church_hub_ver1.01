'use client';

import type { CustomFieldDefinitionDto } from '@church-hub/shared-types';
import { Input } from '@/components/ui/input';

interface Props {
  fields: CustomFieldDefinitionDto[];
  values: Record<string, string | boolean | null | undefined>;
  onChange: (fieldKey: string, value: string | boolean | null) => void;
  title?: string;
}

export function CustomFieldsFormSection({
  fields,
  values,
  onChange,
  title = 'Custom Fields',
}: Props) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="custom-fields-section">
      <p className="text-sm font-medium">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.id}>
            <span className="mb-1 block text-xs text-muted-foreground">
              {field.label}
              {field.isRequired ? ' *' : ''}
            </span>
            {field.fieldType === 'BOOLEAN' ? (
              <input
                type="checkbox"
                checked={Boolean(values[field.fieldKey])}
                onChange={(e) => onChange(field.fieldKey, e.target.checked)}
              />
            ) : (
              <Input
                type={field.fieldType === 'DATE' ? 'date' : field.fieldType === 'NUMBER' ? 'number' : 'text'}
                value={String(values[field.fieldKey] ?? '')}
                onChange={(e) => onChange(field.fieldKey, e.target.value)}
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
