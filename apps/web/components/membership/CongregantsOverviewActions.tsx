'use client';

import Link from 'next/link';
import { FileUp, Home, Settings2, UserPlus, Users } from 'lucide-react';
import { CONGREGANTS_ROUTES } from '@/lib/membership/routes';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  canManage: boolean;
  canViewDirectory: boolean;
  canAdd: boolean;
}

export function CongregantsOverviewActions({ canManage, canViewDirectory, canAdd }: Props) {
  const shortcuts = [
    canViewDirectory
      ? {
          href: CONGREGANTS_ROUTES.members,
          label: 'Members',
          description: 'Search and manage congregant records',
          icon: Users,
          testId: 'congregants-shortcut-members',
        }
      : null,
    canViewDirectory
      ? {
          href: CONGREGANTS_ROUTES.families,
          label: 'Families List',
          description: 'Browse households or add a new family',
          icon: Home,
          testId: 'congregants-shortcut-families',
        }
      : null,
    canAdd
      ? {
          href: `${CONGREGANTS_ROUTES.members}?add=1`,
          label: 'Add Congregant',
          description: 'Register a new congregant record',
          icon: UserPlus,
          testId: 'congregants-shortcut-add-member',
        }
      : null,
    canAdd
      ? {
          href: `${CONGREGANTS_ROUTES.families}?add=1`,
          label: 'Add Family',
          description: 'Register a new household',
          icon: UserPlus,
          testId: 'congregants-shortcut-add-family',
        }
      : null,
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    description: string;
    icon: typeof Users;
    testId: string;
  }>;

  return (
    <div className="space-y-4" data-testid="membership-quick-links">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map(({ href, label, description, icon: Icon, testId }) => (
          <Link key={`${testId}-${href}`} href={href} data-testid={testId}>
            <Card className="h-full transition hover:border-slate-300 hover:shadow-md dark:hover:border-slate-700">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <CardTitle className="text-base">{label}</CardTitle>
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={CONGREGANTS_ROUTES.import}>
              <FileUp className="mr-1.5 h-4 w-4" />
              Import CSV
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={CONGREGANTS_ROUTES.settings}>
              <Settings2 className="mr-1.5 h-4 w-4" />
              Registry Settings
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
