'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { LOGIN_TEST_ACCOUNTS } from '@/lib/auth-test-logins';
import { Button } from '@/components/ui/button';

interface Props {
  onUseAccount: (email: string, password: string) => void;
}

export function LoginTestAccountsPanel({ onUseAccount }: Props) {
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div
      className="mt-6 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm"
      data-testid="login-test-accounts"
    >
      <p className="font-semibold text-foreground">Test logins (local / seeded database)</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Password for both: <code className="rounded bg-muted px-1">{LOGIN_TEST_ACCOUNTS[0].password}</code>
      </p>
      <ul className="mt-3 space-y-3">
        {LOGIN_TEST_ACCOUNTS.map((account) => (
          <li
            key={account.id}
            className="rounded-lg border border-border/60 bg-background/80 p-3"
          >
            <p className="font-medium text-foreground">{account.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{account.hint}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded bg-muted px-2 py-0.5 text-xs">{account.email}</code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onUseAccount(account.email, account.password)}
                data-testid={`login-use-${account.id}`}
              >
                Use this account
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                aria-label={`Copy email for ${account.title}`}
                onClick={() => copy(account.email, 'Email')}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
