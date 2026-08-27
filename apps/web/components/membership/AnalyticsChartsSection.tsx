'use client';

import type { MembershipAnalyticsDashboardDto } from '@church-hub/shared-types';
import {
  Area,
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
import { AnalyticsEmptyState, AnalyticsPanel } from '@/components/membership/AnalyticsPanel';

const chartTick = { fontSize: 11, fontFamily: 'Montserrat', fill: '#64748b' };
const gridStroke = '#e2e8f0';
const primaryStroke = 'hsl(var(--primary))';
const goldStroke = 'hsl(var(--gold))';
const mutedFill = '#cbd5e1';

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

function buildChartSeries(dash: MembershipAnalyticsDashboardDto) {
  return {
    memberGrowthChart: dash.growthTrends.memberGrowth.map((r) => ({
      period: formatPeriod(r.period),
      total: r.total,
      new: r.newInPeriod,
    })),
    convertChart: dash.growthTrends.newConvertGrowth.map((r) => ({
      period: formatPeriod(r.period),
      outreach: r.outreachContacts,
      members: r.newMembers,
    })),
    retentionChart: dash.growthTrends.firstTimerRetention.map((r) => ({
      period: formatPeriod(r.period),
      visitors: r.newVisitors,
      retained: r.retained,
      rate: Math.round(r.retentionRate * 100),
    })),
    absenteeChart: dash.absenteeTrends.map((r) => ({
      period: formatWeek(r.period),
      absent: r.absent,
    })),
    attendanceChart: dash.attendancePerformance.map((r) => ({
      period: formatWeek(r.period),
      rate: Math.round(r.rate * 100),
      present: r.present,
      absent: r.absent,
    })),
    deptChart: dash.departmentPerformance.slice(0, 8).map((d) => ({
      name: d.name.length > 14 ? `${d.name.slice(0, 12)}…` : d.name,
      rate: Math.round(d.rate * 100),
      present: d.present,
      absent: d.absent,
    })),
    followUpChart: dash.followUpCompleteness.map((r) => ({
      period: formatPeriod(r.period),
      created: r.created,
      completed: r.completed,
      rate: Math.round(r.completionRate * 100),
    })),
    stageChart: dash.followUpByStage.map((s) => ({
      stage: s.stage.replace(/_/g, ' '),
      count: s.count,
    })),
  };
}

/** Overview tab — growth + retention. */
export function AnalyticsGrowthCharts({ dash }: { dash: MembershipAnalyticsDashboardDto }) {
  const { memberGrowthChart, convertChart, retentionChart } = buildChartSeries(dash);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsPanel
          title="Member growth"
          subtitle="Cumulative total and new members per month"
        >
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={memberGrowthChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="period" tick={chartTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartTick} axisLine={false} tickLine={false} width={36} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Montserrat' }} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke={primaryStroke}
                  fill={primaryStroke}
                  fillOpacity={0.12}
                />
                <Line type="monotone" dataKey="new" name="New" stroke={goldStroke} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel
          title="New convert growth"
          subtitle="Outreach captures vs new members"
          accent="gold"
        >
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={convertChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="period" tick={chartTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartTick} axisLine={false} tickLine={false} width={36} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Montserrat' }} />
                <Bar dataKey="outreach" name="Outreach" fill={goldStroke} radius={[3, 3, 0, 0]} />
                <Bar dataKey="members" name="Members" fill={primaryStroke} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel
          className="lg:col-span-2"
          title="First-timer retention"
          subtitle="New visitors who advanced to member status in the same month"
        >
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={retentionChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="period" tick={chartTick} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={chartTick} axisLine={false} tickLine={false} width={36} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={chartTick}
                  unit="%"
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Montserrat' }} />
                <Bar yAxisId="left" dataKey="visitors" name="Visitors" fill={mutedFill} radius={[3, 3, 0, 0]} />
                <Bar yAxisId="left" dataKey="retained" name="Retained" fill={primaryStroke} radius={[3, 3, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="rate"
                  name="Rate %"
                  stroke={goldStroke}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsPanel>
      </div>
    </div>
  );
}

/** Trends tab — ops / pipeline charts. */
export function AnalyticsOpsCharts({ dash }: { dash: MembershipAnalyticsDashboardDto }) {
  const { absenteeChart, attendanceChart, deptChart, followUpChart, stageChart } =
    buildChartSeries(dash);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsPanel title="Absentee trends" subtitle="Weekly service absences (8 weeks)">
          <div className="h-52 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={absenteeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="period" tick={chartTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartTick} axisLine={false} tickLine={false} width={36} />
                <Tooltip />
                <Bar dataKey="absent" name="Absent" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel title="Attendance performance" subtitle="Weekly present rate at services">
          <div className="h-52 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="period" tick={chartTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartTick} unit="%" axisLine={false} tickLine={false} width={40} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name="Present %"
                  stroke={primaryStroke}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel title="Department performance" subtitle="Department attendance rate (period)">
          <div className="h-52 sm:h-60">
            {deptChart.length === 0 ? (
              <AnalyticsEmptyState>
                No department attendance recorded yet. Submit weekly unit reports to populate this
                view.
              </AnalyticsEmptyState>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={chartTick} unit="%" axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={72} tick={chartTick} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="rate" name="Rate" fill={primaryStroke} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Outreach completeness"
          subtitle="Leads created vs completed (joined group)"
          accent="gold"
        >
          <div className="h-52 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={followUpChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="period" tick={chartTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartTick} axisLine={false} tickLine={false} width={36} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Montserrat' }} />
                <Bar dataKey="created" name="Created" fill={mutedFill} radius={[3, 3, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill={primaryStroke} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel
          className="lg:col-span-2"
          title="Outreach pipeline"
          subtitle="Current leads by stage across the outreach pipeline"
        >
          <div className="h-48 sm:h-56">
            {stageChart.length === 0 ? (
              <AnalyticsEmptyState>No pipeline leads in this period.</AnalyticsEmptyState>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="stage" tick={chartTick} axisLine={false} tickLine={false} />
                  <YAxis tick={chartTick} axisLine={false} tickLine={false} width={36} />
                  <Tooltip />
                  <Bar dataKey="count" name="Leads" fill={primaryStroke} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </AnalyticsPanel>
      </div>
    </div>
  );
}

/** Full charts (legacy / lazy default). */
export function AnalyticsChartsSection({ dash }: { dash: MembershipAnalyticsDashboardDto }) {
  return (
    <>
      <section className="membership-hub-section space-y-4" aria-labelledby="growth-trends-heading">
        <h2 id="growth-trends-heading" className="font-heading text-lg font-semibold tracking-tight">
          Growth trends
        </h2>
        <AnalyticsGrowthCharts dash={dash} />
      </section>
      <section className="membership-hub-section space-y-4" aria-labelledby="analytics-dashboard-heading">
        <h2 id="analytics-dashboard-heading" className="font-heading text-lg font-semibold tracking-tight">
          Operations trends
        </h2>
        <AnalyticsOpsCharts dash={dash} />
      </section>
    </>
  );
}
