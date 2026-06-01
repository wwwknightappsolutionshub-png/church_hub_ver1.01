'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type {
  DevotionalPlanSourceType,
  DevotionalPlanTone,
  UpsertDevotionalPlanDraftInput,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import {
  BIBLE_BOOKS,
  DEVOTIONAL_SOURCE_OPTIONS,
  DEVOTIONAL_TONE_OPTIONS,
  TOPICAL_BOOK_SUGGESTIONS,
} from '@/lib/devotional-plan-constants';
import { DEVOTIONAL_HUB_ROUTES } from '@/lib/devotional-hub';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const textareaClass =
  'flex min-h-[88px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

export function DevotionalPlanCreator() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [sourceType, setSourceType] = useState<DevotionalPlanSourceType>('CUSTOM_TOPIC');
  const [topicalBook, setTopicalBook] = useState('');
  const [bibleBook, setBibleBook] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfFileUrl, setPdfFileUrl] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [durationMode, setDurationMode] = useState<'days' | 'weeks'>('days');
  const [durationValue, setDurationValue] = useState(7);
  const [tone, setTone] = useState<DevotionalPlanTone>('ADULT');
  const [generateOutline, setGenerateOutline] = useState(true);

  const suggestedTitle = () => {
    if (title.trim()) return title;
    if (sourceType === 'BIBLE_BOOK' && bibleBook) return `${bibleBook} — ${durationValue} ${durationMode}`;
    if (sourceType === 'TOPICAL_BOOK' && topicalBook) return topicalBook;
    if (sourceType === 'CUSTOM_TOPIC' && customTopic) return customTopic;
    if (sourceType === 'PDF_IMPORT' && pdfFileName) return pdfFileName.replace(/\.pdf$/i, '');
    return 'New devotional plan';
  };

  const buildPayload = (): UpsertDevotionalPlanDraftInput => ({
    title: suggestedTitle(),
    description: description.trim() || undefined,
    coverImageUrl: coverImageUrl.trim() || undefined,
    sourceType,
    topicalBook: sourceType === 'TOPICAL_BOOK' ? topicalBook.trim() : undefined,
    bibleBook: sourceType === 'BIBLE_BOOK' ? bibleBook : undefined,
    customTopic: sourceType === 'CUSTOM_TOPIC' ? customTopic.trim() : undefined,
    tone,
    durationDays: durationMode === 'days' ? durationValue : undefined,
    durationWeeks: durationMode === 'weeks' ? durationValue : undefined,
    generateOutline,
  });

  const validateStep = () => {
    if (step === 1) return true;
    if (step === 2) {
      if (sourceType === 'BIBLE_BOOK' && !bibleBook) {
        toast.error('Select a book of the Bible');
        return false;
      }
      if (sourceType === 'TOPICAL_BOOK' && !topicalBook.trim()) {
        toast.error('Enter a topical book title');
        return false;
      }
      if (sourceType === 'CUSTOM_TOPIC' && !customTopic.trim()) {
        toast.error('Enter your custom topic');
        return false;
      }
      if (sourceType === 'PDF_IMPORT' && (!pdfFileName.trim() || !pdfFileUrl.trim())) {
        toast.error('Provide PDF file name and URL');
        return false;
      }
      return true;
    }
    if (step === 3 && !suggestedTitle().trim()) {
      toast.error('Add a plan title');
      return false;
    }
    return true;
  };

  const saveDraft = async () => {
    if (!validateStep()) return;
    setSaving(true);
    try {
      const { data: plan } = await api.post<{ id: string }>(
        '/devotional-hub/plans/drafts',
        buildPayload(),
      );

      if (sourceType === 'PDF_IMPORT') {
        const { data: imp } = await api.post<{ id: string }>(
          '/devotional-hub/pdf/imports',
          {
            fileName: pdfFileName.trim(),
            fileUrl: pdfFileUrl.trim(),
            planId: plan.id,
          },
        );
        await api.post('/devotional-hub/plans/drafts', {
          ...buildPayload(),
          planId: plan.id,
          pdfImportId: imp.id,
          generateOutline: false,
        });
      }

      toast.success(generateOutline ? 'Draft saved with AI outline' : 'Draft saved');
      router.push(DEVOTIONAL_HUB_ROUTES.planEdit(plan.id));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save draft'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 pb-24 md:p-8">
      <div className="flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-emerald-600" />
        <div>
          <h1 className="text-xl font-semibold">Create devotional plan</h1>
          <p className="text-sm text-muted-foreground">Step {step} of 3</p>
        </div>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              n <= step ? 'bg-emerald-600' : 'bg-muted',
            )}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {DEVOTIONAL_SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => setSourceType(opt.type)}
              className={cn(
                'rounded-lg border p-4 text-left transition',
                sourceType === opt.type
                  ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600 dark:bg-emerald-950/30'
                  : 'border-border hover:border-emerald-300',
              )}
            >
              <p className="font-medium">{opt.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{opt.description}</p>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source & schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sourceType === 'TOPICAL_BOOK' && (
              <div className="space-y-2">
                <Label>Topical book</Label>
                <Input
                  value={topicalBook}
                  onChange={(e) => setTopicalBook(e.target.value)}
                  placeholder="e.g. Knowing God"
                  list="topical-suggestions"
                />
                <datalist id="topical-suggestions">
                  {TOPICAL_BOOK_SUGGESTIONS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
            )}
            {sourceType === 'BIBLE_BOOK' && (
              <div className="space-y-2">
                <Label>Book of the Bible</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={bibleBook}
                  onChange={(e) => setBibleBook(e.target.value)}
                >
                  <option value="">Select a book…</option>
                  {BIBLE_BOOKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {sourceType === 'CUSTOM_TOPIC' && (
              <div className="space-y-2">
                <Label>Custom topic</Label>
                <Input
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Faith at school"
                />
              </div>
            )}
            {sourceType === 'PDF_IMPORT' && (
              <>
                <div className="space-y-2">
                  <Label>PDF file name</Label>
                  <Input
                    value={pdfFileName}
                    onChange={(e) => setPdfFileName(e.target.value)}
                    placeholder="study-guide.pdf"
                  />
                </div>
                <div className="space-y-2">
                  <Label>PDF URL</Label>
                  <Input
                    value={pdfFileUrl}
                    onChange={(e) => setPdfFileUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </div>
              </>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Duration</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={durationMode === 'weeks' ? 52 : 365}
                    value={durationValue}
                    onChange={(e) => setDurationValue(parseInt(e.target.value, 10) || 1)}
                  />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                    value={durationMode}
                    onChange={(e) => setDurationMode(e.target.value as 'days' | 'weeks')}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tone (AI & reading level)</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {DEVOTIONAL_TONE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value)}
                    className={cn(
                      'rounded-md border px-3 py-2 text-left text-sm',
                      tone === t.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border',
                    )}
                  >
                    <span className="font-medium">{t.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{t.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={suggestedTitle()}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className={textareaClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will participants experience?"
              />
            </div>
            <div className="space-y-2">
              <Label>Cover image URL (optional)</Label>
              <Input
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://…"
              />
              {coverImageUrl.trim() && (
                <img
                  src={coverImageUrl}
                  alt=""
                  className="h-24 w-full rounded-md object-cover"
                />
              )}
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-dashed p-3">
              <input
                type="checkbox"
                checked={generateOutline}
                onChange={(e) => setGenerateOutline(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                <Sparkles className="mb-1 inline h-4 w-4 text-amber-500" /> Generate AI study
                outline now ({durationValue} {durationMode}, {tone.toLowerCase().replace('_', ' ')}{' '}
                tone)
              </span>
            </label>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={step === 1 || saving}
          onClick={() => setStep((s) => s - 1)}
        >
          Back
        </Button>
        <div className="flex gap-2">
          {step < 3 ? (
            <Button
              type="button"
              onClick={() => {
                if (validateStep()) setStep((s) => s + 1);
              }}
            >
              Continue
            </Button>
          ) : (
            <Button type="button" onClick={saveDraft} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save as draft
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
