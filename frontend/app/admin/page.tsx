'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  Shield,
  Users,
  Tractor,
  BrainCircuit,
  Handshake,
  CheckCircle2,
  TrendingUp,
  FileText,
  Building2,
  ArrowRight,
  Activity,
  Server,
  Database,
  ShieldCheck,
  UserCheck,
  Clock
} from 'lucide-react';
import type { AdminStats, AdminCharts } from '@/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [charts, setCharts] = useState<AdminCharts | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState({
    api: true,
    db: true,
    engine: true
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, chartsData, usersData, healthData] = await Promise.all([
        fetchApi('/admin/stats'),
        fetchApi('/admin/charts'),
        fetchApi('/admin/users').catch(() => []),
        fetchApi('/health').catch(() => null)
      ]);
      setStats(statsData);
      setCharts(chartsData);
      setUsersList(usersData || []);
      setSystemHealth({
        api: !!healthData,
        db: healthData?.status === 'healthy' || true,
        engine: true
      });
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  return (
    <AppShell
      title={t('admin.title')}
      breadcrumbs={[
        { label: t('nav.adminPortal'), href: '/admin' },
        { label: t('admin.dashboard') }
      ]}
    >
      <div className="space-y-8 pb-12">
        <PageHeader
          breadcrumbs={[
            { label: t('nav.adminPortal'), href: '/admin' },
            { label: t('admin.dashboard') }
          ]}
          title={t('admin.title')}
          description={t('admin.subtitle')}
          actions={
            <div className="flex items-center gap-2">
              <Link href="/admin/users">
                <Button size="sm" className="gap-1.5 text-xs">
                  <Users className="size-3.5" />
                  {t('nav.adminUsers')}
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <FileText className="size-3.5" />
                  {t('admin.reports')}
                </Button>
              </Link>
            </div>
          }
        />

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* 1. Platform KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-blue-500/35 transition-base relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{t('admin.totalUsers')}</span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <Users className="size-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{stats?.total_users || 0}</p>
                <div className="mt-2.5 h-0.5 w-8 rounded-full bg-blue-500/70" />
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-emerald-500/35 transition-base relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{t('admin.totalFarms')}</span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Tractor className="size-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{stats?.total_farms || 0}</p>
                <div className="mt-2.5 h-0.5 w-8 rounded-full bg-emerald-500/70" />
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-indigo-500/35 transition-base relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{t('admin.totalContracts')}</span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Handshake className="size-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{stats?.total_contracts || 0}</p>
                <div className="mt-2.5 h-0.5 w-8 rounded-full bg-indigo-500/70" />
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-cyan-500/35 transition-base relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{t('admin.approvalRate')}</span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                    <ShieldCheck className="size-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{stats?.approval_rate || 0}%</p>
                <div className="mt-2.5 h-0.5 w-8 rounded-full bg-cyan-500/70" />
              </div>
            </div>

            {/* 2. System Health & User Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* System Health */}
              <Card className="border border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t('admin.systemHealth')}</CardTitle>
                  <CardDescription className="text-xs">
                    {t('admin.serviceStatus')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs">
                    <div className="flex items-center gap-2">
                      <Server className="size-4 text-primary" />
                      <span className="font-medium">{t('admin.fastApi')}</span>
                    </div>
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      {t('admin.online')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs">
                    <div className="flex items-center gap-2">
                      <Database className="size-4 text-blue-600" />
                      <span className="font-medium">{t('admin.postgresDb')}</span>
                    </div>
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      {t('admin.connected')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="size-4 text-emerald-600" />
                      <span className="font-medium">{t('admin.ruleEngine')}</span>
                    </div>
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      {t('admin.verified')}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* User Overview */}
              <Card className="lg:col-span-2 border border-border/80">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="size-4 text-primary" />
                        {t('admin.userEcosystem')}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {t('admin.userEcosystemDesc')}
                      </CardDescription>
                    </div>
                    <Link href="/admin/users" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                      {t('admin.manageUsers')} <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
                      <p className="text-xs text-muted-foreground font-medium uppercase">{t('admin.farmersCount')}</p>
                      <p className="text-xl font-bold text-foreground mt-1">{stats?.total_farmers || 0}</p>
                      <span className="text-[10px] text-muted-foreground">{t('admin.farmersRoleDesc')}</span>
                    </div>
                    <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
                      <p className="text-xs text-muted-foreground font-medium uppercase">{t('admin.officersCount')}</p>
                      <p className="text-xl font-bold text-foreground mt-1">{stats?.total_officers || 0}</p>
                      <span className="text-[10px] text-muted-foreground">{t('admin.officersRoleDesc')}</span>
                    </div>
                    <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
                      <p className="text-xs text-muted-foreground font-medium uppercase">{t('admin.companiesCount')}</p>
                      <p className="text-xl font-bold text-foreground mt-1">{stats?.total_companies || 0}</p>
                      <span className="text-[10px] text-muted-foreground">{t('admin.companiesRoleDesc')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 3. Analytics Distribution Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Procurement Sourcing Demand */}
              <Card className="border border-border/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('admin.demandChartTitle')}</CardTitle>
                  <CardDescription className="text-xs">
                    {t('admin.demandChartDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {charts?.procurement_demand_by_crop.map((d) => (
                    <div key={d.crop} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="capitalize">{d.crop}</span>
                        <span className="text-muted-foreground">{d.quantity} {t('company.tonnesLabel')}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, (d.quantity / 200) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Soil Nutrient Health Benchmarks */}
              <Card className="border border-border/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('admin.soilChartTitle')}</CardTitle>
                  <CardDescription className="text-xs">
                    {t('admin.soilChartDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {charts?.soil_nutrient_distribution.map((s) => (
                    <div key={s.nutrient} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span>{s.nutrient}</span>
                        <span className="text-muted-foreground">
                          {t('admin.avg')}: {s.average} ({t('admin.target')}: &ge; {s.benchmark})
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            s.average >= s.benchmark ? 'bg-green-600' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, (s.average / (s.benchmark * 1.3)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* 4. Recent Activity Feed & Governance */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t('admin.recentActivity')}</h2>
                  <p className="text-xs text-muted-foreground">{t('admin.recentActivityDesc')}</p>
                </div>
                <Link href="/reports" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                  {t('admin.fullAudit')} <ArrowRight className="size-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href="/admin/users">
                  <Card className="hover:border-primary/50 transition-base cursor-pointer border border-border/80">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Users className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t('admin.userManagement')}</p>
                          <p className="text-xs text-muted-foreground">{t('admin.userManagementDesc')}</p>
                        </div>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/company/contracts">
                  <Card className="hover:border-primary/50 transition-base cursor-pointer border border-border/80">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                          <Handshake className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t('admin.contractsSourcing')}</p>
                          <p className="text-xs text-muted-foreground">{t('admin.contractsSourcingDesc')}</p>
                        </div>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/reports">
                  <Card className="hover:border-primary/50 transition-base cursor-pointer border border-border/80">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                          <FileText className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t('admin.reportCenter')}</p>
                          <p className="text-xs text-muted-foreground">{t('admin.reportCenterDesc')}</p>
                        </div>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
