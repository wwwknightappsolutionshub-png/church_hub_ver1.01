'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, Loader2, Mail, MessageSquareHeart } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-errors';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type FormKind = 'contact' | 'feedback';

const FORM_TABS: { id: FormKind; label: string; icon: typeof Mail; description: string }[] = [
  {
    id: 'contact',
    label: 'Contact us',
    icon: Mail,
    description: 'Sales, demos, partnerships, or general questions.',
  },
  {
    id: 'feedback',
    label: 'Share feedback',
    icon: MessageSquareHeart,
    description: 'Tell us what is working and what we can improve.',
  },
];

export default function ContactPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('type') === 'feedback' ? 'feedback' : 'contact';
  const [kind, setKind] = useState<FormKind>(initialTab);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | ''>('');

  const activeTab = useMemo(() => FORM_TABS.find((t) => t.id === kind)!, [kind]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setOrganization('');
    setSubject('');
    setMessage('');
    setRating('');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/marketing/inbound', {
        type: kind === 'contact' ? 'CONTACT' : 'FEEDBACK',
        name: name.trim(),
        email: email.trim(),
        organization: organization.trim() || undefined,
        subject: subject.trim() || undefined,
        message: message.trim(),
        rating: rating === '' ? undefined : Number(rating),
      });
      resetForm();
      toast.success(
        kind === 'contact' ? 'Message sent — we will reply soon' : 'Thank you for your feedback',
        {
          description: 'Our team at support@church-hub.online has received your submission.',
        },
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send your message. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border bg-sidebar text-sidebar-foreground">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-faint opacity-20" />
          <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
            <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm text-sidebar-foreground/70">
              <Link href="/" className="transition-colors hover:text-white">
                Home
              </Link>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              <span className="text-sidebar-foreground/90">Contact & feedback</span>
            </nav>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Contact & feedback
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-sidebar-foreground/75">
              Reach the Church Hub team for demos, support, or product feedback. Choose the form that
              fits — both routes go to our platform team at support@church-hub.online.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-10 lg:px-8 lg:py-14">
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {FORM_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = kind === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setKind(tab.id)}
                  className={cn(
                    'rounded-xl border p-4 text-left transition',
                    active
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                      : 'border-border bg-card hover:border-primary/30 hover:bg-muted/40',
                  )}
                  aria-pressed={active}
                >
                  <span className="flex items-center gap-2 font-heading text-sm font-semibold">
                    <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
                    {tab.label}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{tab.description}</span>
                </button>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{activeTab.label}</CardTitle>
              <CardDescription>{activeTab.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name</Label>
                    <Input
                      id="name"
                      required
                      minLength={2}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {kind === 'contact' ? (
                  <div className="space-y-2">
                    <Label htmlFor="organization">Church or organization (optional)</Label>
                    <Input
                      id="organization"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="subject">
                    {kind === 'contact' ? 'Subject' : 'Topic (optional)'}
                  </Label>
                  <Input
                    id="subject"
                    required={kind === 'contact'}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={
                      kind === 'contact' ? 'e.g. Request a demo' : 'e.g. Mobile dashboard experience'
                    }
                  />
                </div>

                {kind === 'feedback' ? (
                  <div className="space-y-2">
                    <Label htmlFor="rating">Overall rating (optional)</Label>
                    <select
                      id="rating"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={rating}
                      onChange={(e) =>
                        setRating(e.target.value === '' ? '' : Number(e.target.value))
                      }
                    >
                      <option value="">No rating</option>
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} — {n === 5 ? 'Excellent' : n === 4 ? 'Good' : n === 3 ? 'Okay' : n === 2 ? 'Fair' : 'Poor'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    required
                    minLength={10}
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      kind === 'contact'
                        ? 'How can we help your church community?'
                        : 'Share your experience, ideas, or issues…'
                    }
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : kind === 'contact' ? (
                    'Send message'
                  ) : (
                    'Submit feedback'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
