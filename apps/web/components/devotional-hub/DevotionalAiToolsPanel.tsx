'use client';

import { useEffect, useState } from 'react';
import {
  BookMarked,
  FileText,
  HandHeart,
  HelpCircle,
  Loader2,
  MessageCircleQuestion,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  DevotionalAiArtifactDto,
  DevotionalPdfImportDto,
  DevotionalPdfReadingLevel,
  DevotionalPlanSourceType,
  DevotionalPlanTone,
  DevotionalPrayerPointSource,
  DevotionalPrayerPointsDto,
  DevotionalScriptureAnswerDto,
  DevotionalScriptureDepth,
  DevotionalStudyOutlineDto,
  DevotionalTodayDto,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import {
  BIBLE_BOOKS,
  DEVOTIONAL_SOURCE_OPTIONS,
  DEVOTIONAL_TONE_OPTIONS,
  TOPICAL_BOOK_SUGGESTIONS,
} from '@/lib/devotional-plan-constants';
import {
  cacheDevotionalAiResult,
  readDevotionalAiCache,
} from '@/lib/devotional-ai-cache';
import { DEVOTIONAL_QUERY_KEYS, DEVOTIONAL_QUERY_STALE } from '@/lib/devotional-hub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type AiToolSection = 'outline' | 'prayer' | 'scripture' | 'pdf';

const textareaClass =
  'flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

const PRAYER_SOURCES: Array<{ value: DevotionalPrayerPointSource; label: string }> = [
  { value: 'SCRIPTURE', label: 'From scripture' },
  { value: 'TOPIC', label: 'From topic' },
  { value: 'PDF', label: 'From PDF import' },
  { value: 'DAILY_SECTION', label: 'From today\'s reading' },
];

const DEPTH_MODES: Array<{ value: DevotionalScriptureDepth; label: string; hint: string }> = [
  { value: 'SIMPLE', label: 'Simple', hint: 'Plain language for any age' },
  { value: 'YOUTH', label: 'Youth', hint: 'Teen-friendly and relatable' },
  { value: 'ADULT_THEOLOGICAL', label: 'Adult / theological', hint: 'Deeper study and doctrine' },
];

const PDF_LEVELS: Array<{ value: DevotionalPdfReadingLevel; label: string }> = [
  { value: 'KIDS_8_12', label: 'Kids (8–12)' },
  { value: 'TEENS', label: 'Teens' },
  { value: 'YOUTH', label: 'Youth' },
  { value: 'ADULTS', label: 'Adults' },
  { value: 'NEW_BELIEVER', label: 'New believers' },
];

const SECTIONS: Array<{ id: AiToolSection; label: string; icon: typeof Sparkles }> = [
  { id: 'outline', label: 'Study outline', icon: BookMarked },
  { id: 'prayer', label: 'Prayer points', icon: HandHeart },
  { id: 'scripture', label: 'Ask Scripture', icon: MessageCircleQuestion },
  { id: 'pdf', label: 'PDF tools', icon: FileText },
];

interface DevotionalAiToolsPanelProps {
  activePlanId?: string | null;
}

export function DevotionalAiToolsPanel({ activePlanId }: DevotionalAiToolsPanelProps) {
  const [section, setSection] = useState<AiToolSection>('outline');
  const [loading, setLoading] = useState(false);

  const [sourceType, setSourceType] = useState<DevotionalPlanSourceType>('CUSTOM_TOPIC');
  const [topicalBook, setTopicalBook] = useState('');
  const [bibleBook, setBibleBook] = useState('John');
  const [customTopic, setCustomTopic] = useState('');
  const [tone, setTone] = useState<DevotionalPlanTone>('ADULT');
  const [durationDays, setDurationDays] = useState(7);
  const [outline, setOutline] = useState<DevotionalStudyOutlineDto | null>(null);

  const [prayerSource, setPrayerSource] = useState<DevotionalPrayerPointSource>('SCRIPTURE');
  const [prayerPrompt, setPrayerPrompt] = useState('');
  const [prayerContext, setPrayerContext] = useState('');
  const [prayerResult, setPrayerResult] = useState<DevotionalPrayerPointsDto | null>(null);

  const [question, setQuestion] = useState('');
  const [passage, setPassage] = useState('');
  const [depth, setDepth] = useState<DevotionalScriptureDepth>('SIMPLE');
  const [scriptureAnswer, setScriptureAnswer] = useState<DevotionalScriptureAnswerDto | null>(null);

  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfFileUrl, setPdfFileUrl] = useState('');
  const [pdfImportId, setPdfImportId] = useState('');
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfImport, setPdfImport] = useState<DevotionalPdfImportDto | null>(null);
  const [lastSimplified, setLastSimplified] = useState<string | null>(null);

  const today = useApiQuery<DevotionalTodayDto>(
    DEVOTIONAL_QUERY_KEYS.today(activePlanId ?? ''),
    `/devotional-hub/plans/${activePlanId}/today`,
    { enabled: !!activePlanId && prayerSource === 'DAILY_SECTION' },
  );

  const artifacts = useApiQuery<DevotionalAiArtifactDto[]>(
    DEVOTIONAL_QUERY_KEYS.aiArtifacts(activePlanId ?? undefined),
    `/devotional-hub/ai/artifacts?limit=12${activePlanId ? `&planId=${activePlanId}` : ''}`,
    { staleTime: DEVOTIONAL_QUERY_STALE.aiArtifacts },
  );

  useEffect(() => {
    const o = readDevotionalAiCache('outline');
    if (o?.data) setOutline(o.data);
    const p = readDevotionalAiCache('prayer');
    if (p?.data) setPrayerResult(p.data);
    const s = readDevotionalAiCache('scripture');
    if (s?.data) setScriptureAnswer(s.data);
    const pdf = readDevotionalAiCache('pdf');
    if (pdf?.data?.simplified) setLastSimplified(pdf.data.simplified);
  }, []);

  const fillFromToday = () => {
    if (!today.data) {
      toast.error('Select an active plan on Today tab first');
      return;
    }
    const d = today.data.day;
    setPrayerPrompt(
      [d.scriptureRef, d.scriptureText, d.reflection].filter(Boolean).join(' — ').slice(0, 500),
    );
    setPrayerContext(`Day ${today.data.dayNumber}: ${d.title}`);
  };

  const generateOutline = async () => {
    setLoading(true);
    setOutline(null);
    try {
      const { data } = await api.post<DevotionalStudyOutlineDto>('/devotional-hub/ai/study-outline', {
        sourceType,
        topicalBook: sourceType === 'TOPICAL_BOOK' ? topicalBook : undefined,
        bibleBook: sourceType === 'BIBLE_BOOK' ? bibleBook : undefined,
        customTopic: sourceType === 'CUSTOM_TOPIC' ? customTopic : undefined,
        tone,
        durationDays,
        planId: activePlanId ?? undefined,
      });
      setOutline(data);
      cacheDevotionalAiResult({ section: 'outline', data });
      toast.success('Study outline generated');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not generate outline'));
    } finally {
      setLoading(false);
    }
  };

  const generatePrayer = async () => {
    if (!prayerPrompt.trim()) {
      toast.error('Enter scripture, topic, or section text');
      return;
    }
    setLoading(true);
    setPrayerResult(null);
    try {
      const { data } = await api.post<DevotionalPrayerPointsDto>('/devotional-hub/ai/prayer-points', {
        source: prayerSource,
        prompt: prayerPrompt,
        context: prayerContext || undefined,
        planId: activePlanId ?? undefined,
        dayId:
          prayerSource === 'DAILY_SECTION' && today.data?.day.id && !today.data.day.id.startsWith('legacy-')
            ? today.data.day.id
            : undefined,
        pdfImportId: prayerSource === 'PDF' ? pdfImportId || undefined : undefined,
      });
      setPrayerResult(data);
      cacheDevotionalAiResult({ section: 'prayer', data });
      toast.success('Prayer points ready');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not generate prayer points'));
    } finally {
      setLoading(false);
    }
  };

  const askScripture = async () => {
    if (question.trim().length < 3) {
      toast.error('Enter a question (at least 3 characters)');
      return;
    }
    setLoading(true);
    setScriptureAnswer(null);
    try {
      const { data } = await api.post<DevotionalScriptureAnswerDto>(
        '/devotional-hub/ai/ask-scripture',
        {
          question,
          passage: passage || undefined,
          depth,
          planId: activePlanId ?? undefined,
        },
      );
      setScriptureAnswer(data);
      cacheDevotionalAiResult({ section: 'scripture', data });
      toast.success('Answer generated');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not answer question'));
    } finally {
      setLoading(false);
    }
  };

  const registerPdf = async () => {
    if (!pdfFileName.trim() || !pdfFileUrl.trim()) {
      toast.error('File name and URL are required');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post<{ id: string }>('/devotional-hub/pdf/imports', {
        fileName: pdfFileName,
        fileUrl: pdfFileUrl,
        planId: activePlanId ?? undefined,
      });
      setPdfImportId(data.id);
      toast.success('PDF registered — processing…');
      await refreshPdf(data.id);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not register PDF'));
    } finally {
      setLoading(false);
    }
  };

  const refreshPdf = async (id?: string) => {
    const importId = id ?? pdfImportId;
    if (!importId) return;
    try {
      const { data } = await api.get<DevotionalPdfImportDto>(`/devotional-hub/pdf/imports/${importId}`);
      setPdfImport(data);
      setPdfImportId(importId);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load PDF import'));
    }
  };

  const processPdf = async () => {
    if (!pdfImportId) {
      toast.error('Register or enter a PDF import ID');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/devotional-hub/pdf/imports/${pdfImportId}/process`);
      await refreshPdf();
      toast.success('PDF processed into devotional days');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Processing failed'));
    } finally {
      setLoading(false);
    }
  };

  const simplifyPdf = async (readingLevel: DevotionalPdfReadingLevel) => {
    if (!pdfImportId) {
      toast.error('Load a PDF import first');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post<{ simplified: string; artifactId: string }>(
        `/devotional-hub/pdf/imports/${pdfImportId}/simplify`,
        { readingLevel, pageNumber: pdfPage },
      );
      setLastSimplified(data.simplified);
      cacheDevotionalAiResult({
        section: 'pdf',
        data: { simplified: data.simplified, artifactId: data.artifactId },
      });
      await refreshPdf();
      toast.success(`Simplified for ${PDF_LEVELS.find((l) => l.value === readingLevel)?.label}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Simplify failed'));
    } finally {
      setLoading(false);
    }
  };

  const restoreArtifact = (row: DevotionalAiArtifactDto) => {
    const c = row.content as Record<string, unknown>;
    if (row.type === 'STUDY_OUTLINE' && c.summary) {
      setSection('outline');
      setOutline(c as unknown as DevotionalStudyOutlineDto);
      return;
    }
    if (row.type === 'PRAYER_POINTS' && c.points) {
      setSection('prayer');
      setPrayerResult({ ...c, artifactId: row.id } as DevotionalPrayerPointsDto);
      return;
    }
    if (row.type === 'SCRIPTURE_ASK' && c.answer) {
      setSection('scripture');
      setScriptureAnswer({ ...c, artifactId: row.id } as DevotionalScriptureAnswerDto);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {loading ? 'Generating AI content…' : ''}
      </div>
      <Card className="border-violet-200/50 bg-gradient-to-br from-violet-50/30 to-background dark:from-violet-950/20">
        <CardContent className="flex flex-wrap items-center gap-2 py-4 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-violet-600" />
          AI study tools use structured placeholders until a provider is configured (
          <code className="text-xs">DEVOTIONAL_AI_MODEL</code>). Results are saved as artifacts for your church.
        </CardContent>
      </Card>

      {(artifacts.data ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent AI results</CardTitle>
            <p className="text-sm text-muted-foreground">Cached on server — tap to restore</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(artifacts.data ?? []).slice(0, 8).map((a) => (
              <Button
                key={a.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => restoreArtifact(a)}
              >
                {a.type.replace(/_/g, ' ').toLowerCase()}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <nav className="flex flex-wrap gap-2" role="tablist" aria-label="AI tools">
        {SECTIONS.map((s) => (
          <Button
            key={s.id}
            type="button"
            size="sm"
            variant={section === s.id ? 'default' : 'outline'}
            role="tab"
            aria-selected={section === s.id}
            onClick={() => setSection(s.id)}
            className="gap-1.5"
          >
            <s.icon className="h-3.5 w-3.5" />
            {s.label}
          </Button>
        ))}
      </nav>

      {section === 'outline' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Study outline generator</CardTitle>
            <p className="text-sm text-muted-foreground">
              Topics, books of the Bible, topical books, or custom themes — with summary, breakdown, questions, and
              application points.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {DEVOTIONAL_SOURCE_OPTIONS.filter((o) => o.type !== 'PDF_IMPORT').map((o) => (
                <button
                  key={o.type}
                  type="button"
                  onClick={() => setSourceType(o.type)}
                  className={cn(
                    'rounded-lg border p-3 text-left text-sm transition',
                    sourceType === o.type
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <span className="font-medium">{o.label}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{o.description}</p>
                </button>
              ))}
            </div>

            {sourceType === 'BIBLE_BOOK' && (
              <div>
                <Label>Book of the Bible</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={bibleBook}
                  onChange={(e) => setBibleBook(e.target.value)}
                >
                  {BIBLE_BOOKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {sourceType === 'TOPICAL_BOOK' && (
              <div>
                <Label>Topical book</Label>
                <Input
                  list="topical-suggestions"
                  value={topicalBook}
                  onChange={(e) => setTopicalBook(e.target.value)}
                  placeholder="e.g. Mere Christianity"
                />
                <datalist id="topical-suggestions">
                  {TOPICAL_BOOK_SUGGESTIONS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
            )}
            {sourceType === 'CUSTOM_TOPIC' && (
              <div>
                <Label>Custom topic</Label>
                <Input
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Forgiveness in community"
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Tone</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as DevotionalPlanTone)}
                >
                  {DEVOTIONAL_TONE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value) || 7)}
                />
              </div>
            </div>

            <Button onClick={generateOutline} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate outline
            </Button>

            {outline && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <Badge variant="secondary">{outline.sourceLabel}</Badge>
                  <p className="mt-2 text-sm leading-relaxed">{outline.summary}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Breakdown</h4>
                  <ul className="mt-2 space-y-2 text-sm">
                    {outline.breakdown.map((b) => (
                      <li key={b.dayNumber} className="rounded-md bg-muted/40 px-3 py-2">
                        <span className="font-medium">
                          Day {b.dayNumber}: {b.title}
                        </span>
                        {b.scriptureRef && (
                          <span className="ml-2 text-primary">{b.scriptureRef}</span>
                        )}
                        <p className="text-muted-foreground">{b.focus}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold">Study questions</h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                      {outline.studyQuestions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Application points</h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                      {outline.applicationPoints.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {section === 'prayer' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prayer point generator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PRAYER_SOURCES.map((s) => (
                <Button
                  key={s.value}
                  type="button"
                  size="sm"
                  variant={prayerSource === s.value ? 'default' : 'outline'}
                  onClick={() => setPrayerSource(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </div>

            {prayerSource === 'DAILY_SECTION' && (
              <Button type="button" variant="secondary" size="sm" onClick={fillFromToday}>
                Use today&apos;s reading
              </Button>
            )}
            {prayerSource === 'PDF' && (
              <div>
                <Label>PDF import ID</Label>
                <Input value={pdfImportId} onChange={(e) => setPdfImportId(e.target.value)} />
              </div>
            )}

            <div>
              <Label>Scripture / topic / section</Label>
              <textarea
                className={textareaClass}
                value={prayerPrompt}
                onChange={(e) => setPrayerPrompt(e.target.value)}
                placeholder="Paste a verse, theme, or section summary…"
              />
            </div>
            <div>
              <Label>Extra context (optional)</Label>
              <Input value={prayerContext} onChange={(e) => setPrayerContext(e.target.value)} />
            </div>

            <Button onClick={generatePrayer} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HandHeart className="mr-2 h-4 w-4" />}
              Generate prayer points
            </Button>

            {prayerResult && (
              <div className="space-y-3 border-t pt-4">
                <p className="font-medium">{prayerResult.title}</p>
                {prayerResult.points.map((p) => (
                  <div key={p.category} className="rounded-md border p-3 text-sm">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">{p.category}</span>
                    <p className="mt-1">{p.text}</p>
                  </div>
                ))}
                <p className="italic text-muted-foreground">{prayerResult.closing}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {section === 'scripture' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Ask the Scripture
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Ask a question; AI analyzes the passage in your chosen depth mode.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {DEPTH_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setDepth(m.value)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left text-sm',
                    depth === m.value ? 'border-primary bg-primary/5' : 'border-border',
                  )}
                >
                  <span className="font-medium">{m.label}</span>
                  <p className="text-xs text-muted-foreground">{m.hint}</p>
                </button>
              ))}
            </div>
            <div>
              <Label>Your question</Label>
              <textarea
                className={textareaClass}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What does this passage teach about…?"
              />
            </div>
            <div>
              <Label>Passage reference or text (optional)</Label>
              <Input
                value={passage}
                onChange={(e) => setPassage(e.target.value)}
                placeholder="John 3:16 or paste verses"
              />
            </div>
            <Button onClick={askScripture} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MessageCircleQuestion className="mr-2 h-4 w-4" />
              )}
              Get answer
            </Button>

            {scriptureAnswer && (
              <div className="space-y-3 border-t pt-4 text-sm">
                <Badge variant="outline">{scriptureAnswer.depth.replace(/_/g, ' ')}</Badge>
                <p className="leading-relaxed">{scriptureAnswer.answer}</p>
                <ul className="list-disc space-y-1 pl-5">
                  {scriptureAnswer.insights.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
                <p className="rounded-md bg-muted/50 p-3 italic">{scriptureAnswer.reflectionPrompt}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {section === 'pdf' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">PDF import & simplify</CardTitle>
            <p className="text-sm text-muted-foreground">
              Register a PDF URL, extract pages into a devotional plan, then simplify for kids, teens, youth, adults, or
              new believers.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>File name</Label>
                <Input value={pdfFileName} onChange={(e) => setPdfFileName(e.target.value)} placeholder="study.pdf" />
              </div>
              <div>
                <Label>File URL</Label>
                <Input value={pdfFileUrl} onChange={(e) => setPdfFileUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={registerPdf} disabled={loading} variant="default">
                Register & process
              </Button>
              <Button type="button" variant="outline" onClick={() => refreshPdf()} disabled={!pdfImportId}>
                Refresh status
              </Button>
            </div>

            <div>
              <Label>Import ID</Label>
              <Input value={pdfImportId} onChange={(e) => setPdfImportId(e.target.value)} />
            </div>

            {pdfImport && (
              <div className="rounded-md border p-3 text-sm">
                <p>
                  <span className="font-medium">{pdfImport.fileName}</span>
                  <Badge className="ml-2" variant="secondary">
                    {pdfImport.status}
                  </Badge>
                </p>
                {pdfImport.metadata?.devotionalDays && (
                  <p className="mt-1 text-muted-foreground">
                    {pdfImport.metadata.devotionalDays.length} devotional days from{' '}
                    {pdfImport.metadata.pages?.length ?? pdfImport.pageCount ?? 0} pages
                  </p>
                )}
              </div>
            )}

            <Button type="button" variant="secondary" size="sm" onClick={processPdf} disabled={loading || !pdfImportId}>
              Re-run extraction
            </Button>

            <div className="flex items-center gap-3">
              <Label>Page</Label>
              <Input
                type="number"
                min={1}
                className="w-24"
                value={pdfPage}
                onChange={(e) => setPdfPage(Number(e.target.value) || 1)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {PDF_LEVELS.map((l) => (
                <Button
                  key={l.value}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading || !pdfImportId}
                  onClick={() => simplifyPdf(l.value)}
                >
                  {l.label}
                </Button>
              ))}
            </div>

            {lastSimplified && (
              <div className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed">{lastSimplified}</div>
            )}

            {pdfImport?.metadata?.pages && pdfImport.metadata.pages.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">Extracted pages</summary>
                <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                  {pdfImport.metadata.pages.map((p) => (
                    <li key={p.pageNumber} className="rounded border p-2 text-muted-foreground">
                      <span className="font-medium text-foreground">Page {p.pageNumber}</span>
                      <p className="mt-1 line-clamp-3">{p.text}</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
