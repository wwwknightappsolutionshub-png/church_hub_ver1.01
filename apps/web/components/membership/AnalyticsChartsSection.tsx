'use client';

import type { MembershipAnalyticsDashboardDto } from '@church-hub/shared-types';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const chartTick = { fontSize: 11, fontFamily: 'Montserrat' };

function formatPeriod(key: string) {
  const [y, m] = key.split('-');
  if (!m) return key;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function formatWeek(key: string) {
  const d = new Date(key);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function AnalyticsChartsSection({ dash }: { dash: MembershipAnalyticsDashboardDto }) {
  const memberGrowthChart = dash.growthTrends.memberGrowth.map((r) => ({
    period: formatPeriod(r.period),
    total: r.total,
    new: r.newInPeriod,
  }));

  const convertChart = dash.growthTrends.newConvertGrowth.map((r) => ({
    period: formatPeriod(r.period),
    outreach: r.outreachContacts,
    members: r.newMembers,
  }));

  const retentionChart = dash.growthTrends.firstTimerRetention.map((r) => ({
    period: formatPeriod(r.period),
    visitors: r.newVisitors,
    retained: r.retained,
    rate: Math.round(r.retentionRate * 100),
  }));

  const absenteeChart = dash.absenteeTrends.map((r) => ({
    period: formatWeek(r.period),
    absent: r.absent,
  }));

  const attendanceChart = dash.attendancePerformance.map((r) => ({
    period: formatWeek(r.period),
    rate: Math.round(r.rate * 100),
    present: r.present,
    absent: r.absent,
  }));

  const deptChart = dash.departmentPerformance.slice(0, 8).map((d) => ({
    name: d.name.length > 14 ? `${d.name.slice(0, 12)}…` : d.name,
    rate: Math.round(d.rate * 100),
    present: d.present,
    absent: d.absent,
  }));

  const followUpChart = dash.followUpCompleteness.map((r) => ({
    period: formatPeriod(r.period),
    created: r.created,
    completed: r.completed,
    rate: Math.round(r.completionRate * 100),
  }));

  const stageChart = dash.followUpByStage.map((s) => ({
    stage: s.stage.replace(/_/g, ' '),
    count: s.count,
  }));

  return (
    <>
      <section className="membership-hub-section space-y-4" aria-labelledby="growth-trends-heading">
        <h2 id="growth-trends-heading" className="text-lg font-semibold">
          Growth trends
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Member growth</CardTitle>
              <CardDescription>Cumulative total and new members per month</CardDescription>
            </CardHeader>
            <CardContent className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={memberGrowthChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={chartTick} />
                  <YAxis tick={chartTick} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.15}
                  />
                  <Line type="monotone" dataKey="new" name="New" stroke="hsl(var(--gold))" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">New convert growth</CardTitle>
              <CardDescription>Outreach captures vs new members</CardDescription>
            </CardHeader>
            <CardContent className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={convertChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={chartTick} />
                  <YAxis tick={chartTick} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="outreach" name="Outreach" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="members" name="Members" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">First-timer retention</CardTitle>
              <CardDescription>
                New visitors who advanced to member status in the same month
              </CardDescription>
            </CardHeader>
            <CardContent className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={retentionChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={chartTick} />
                  <YAxis yAxisId="left" tick={chartTick} />
                  <YAxis yAxisId="right" orientation="right" tick={chartTick} unit="%" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="visitors" name="Visitors" fill="hsl(var(--muted))" />
                  <Bar yAxisId="left" dataKey="retained" name="Retained" fill="hsl(var(--primary))" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rate"
                    name="Rate %"
                    stroke="hsl(var(--gold))"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="membership-hub-section space-y-4" aria-labelledby="analytics-dashboard-heading">
        <h2 id="analytics-dashboard-heading" className="text-lg font-semibold">
          Analytics dashboard
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Absentee trends</CardTitle>
              <CardDescription>Weekly service absences (8 weeks)</CardDescription>
            </CardHeader>
            <CardContent className="h-52 sm:h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={absenteeChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={chartTick} />
                  <YAxis tick={chartTick} />
                  <Tooltip />
                  <Bar dataKey="absent" name="Absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Attendance performance</CardTitle>
              <CardDescription>Weekly present rate at services</CardDescription>
            </CardHeader>
            <CardContent className="h-52 sm:h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={chartTick} />
                  <YAxis tick={chartTick} unit="%" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    name="Present %"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Department performance</CardTitle>
              <CardDescription>Department attendance rate (period)</CardDescription>
            </CardHeader>
            <CardContent className="h-52 sm:h-60">
              {deptChart.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No department attendance recorded yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChart} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={chartTick} unit="%" />
                    <YAxis type="category" dataKey="name" width={72} tick={chartTick} />
                    <Tooltip />
                    <Bar dataKey="rate" name="Rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Follow-up completeness</CardTitle>
              <CardDescription>Leads created vs completed (joined group)</CardDescription>
            </CardHeader>
            <CardContent className="h-52 sm:h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={followUpChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={chartTick} />
                  <YAxis tick={chartTick} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="created" name="Created" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Follow-up pipeline</CardTitle>
              <CardDescription>Current leads by stage</CardDescription>
            </CardHeader>
            <CardContent className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="stage" tick={chartTick} />
                  <YAxis tick={chartTick} />
                  <Tooltip />
                  <Bar dataKey="count" name="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
