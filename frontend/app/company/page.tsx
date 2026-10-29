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
  Building2,
  ShoppingBag,
  Handshake,
  CheckCircle2,
  TrendingUp,
  Clock,
  PlusCircle,
  ArrowRight,
  FileText,
  AlertCircle,
  Bell,
  Users
} from 'lucide-react';
import type { Company, ProcurementRequirement, Contract, NotificationItem } from '@/types';

export default function CompanyDashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [procurements, setProcurements] = useState<ProcurementRequirement[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const compData = await fetchApi('/companies/me');
      setCompany(compData);

      if (compData?.id) {
        const [procData, contData, analData, notifData] = await Promise.all([
          fetchApi(`/companies/${compData.id}/procurements`),
          fetchApi('/contracts'),
          fetchApi('/companies/analytics/overview').catch(() => null),
          fetchApi('/notifications?unread_only=false').catch(() => [])
        ]);
        setProcurements(procData || []);
        setContracts(contData || []);
        setAnalytics(analData);
        setNotifications((notifData || []).slice(0, 4));
      }
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
      title={company?.company_name || t('company.title')}
      breadcrumbs={[
        { label: t('company.portal'), href: '/company' },
        { label: t('company.dashboard') }
      ]}
    >
      <div className="space-y-8 pb-12">
        <PageHeader
          breadcrumbs={[
            { label: t('company.portal'), href: '/company' },
            { label: t('company.dashboard') }
          ]}
          title={company?.company_name || t('company.title')}
          description={t('company.subtitle')}
          actions={
            <div className="flex items-center gap-2">
              <Link href="/company/procurements">
                <Button size="sm" className="gap-1.5 text-xs">
                  <PlusCircle className="size-3.5" />
                  {t('company.newProcurement')}
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <FileText className="size-3.5" />
                  {t('company.reports')}
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
            {/* 1. Procurement Summary (KPIs) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-blue-500/35 transition-base relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{t('company.activeOrders')}</span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <ShoppingBag className="size-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {procurements.filter((p) => p.status === 'OPEN').length}
                </p>
                <div className="mt-2.5 h-0.5 w-8 rounded-full bg-blue-500/70" />
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-emerald-500/35 transition-base relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{t('company.committedQuantity')}</span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <TrendingUp className="size-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {analytics?.committed_quantity || 0} <span className="text-sm font-normal text-muted-foreground">{t('company.tonnesUnit')}</span>
                </p>
                <div className="mt-2.5 h-0.5 w-8 rounded-full bg-emerald-500/70" />
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-cyan-500/35 transition-base relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{t('company.fulfillmentRate')}</span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                    <CheckCircle2 className="size-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {analytics?.fulfillment_percentage || 0}%
                </p>
                <div className="mt-2.5 h-0.5 w-8 rounded-full bg-cyan-500/70" />
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-amber-500/35 transition-base relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{t('company.pendingApplications')}</span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                    <Clock className="size-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {analytics?.pending_applications || contracts.filter((c) => c.status === 'APPLICATION_SUBMITTED').length}
                </p>
                <div className="mt-2.5 h-0.5 w-8 rounded-full bg-amber-500/70" />
              </div>
            </div>

            {/* 2. Procurement Requirements */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{t('company.procurementRequirements')}</h2>
                <Link href="/company/procurements" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  {t('company.manageRequirements')} <ArrowRight className="size-3" />
                </Link>
              </div>

              {procurements.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <ShoppingBag className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm font-medium text-foreground">{t('company.noRequirements')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('company.noRequirementsDesc')}</p>
                    <Link href="/company/procurements">
                      <Button size="sm" className="mt-4 gap-1.5 text-xs">
                        <PlusCircle className="size-3.5" />
                        {t('company.createRequirement')}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {procurements.slice(0, 3).map((p) => (
                    <Card key={p.id} className="hover:border-primary/40 transition-base border border-border/80">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="capitalize text-xs font-semibold">
                            {p.crop}
                          </Badge>
                          <Badge variant={p.status === 'OPEN' ? 'default' : 'outline'} className="text-[11px]">
                            {p.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-base mt-2">
                          {p.required_quantity} {t('company.tonnesLabel')} @ ${p.offered_price}/{t('company.tonnesUnit')}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {t('company.grade')}: {p.minimum_quality_grade} • {t('company.harvest')}: {p.harvest_window || t('company.seasonal')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 text-xs text-muted-foreground space-y-1.5 border-t border-border/60 p-4">
                        <div className="flex justify-between">
                          <span>{t('company.minFarmSize')}:</span>
                          <span className="font-medium text-foreground">{p.minimum_farm_size || 1.0} ha</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('company.preferredIrrigation')}:</span>
                          <span className="font-medium text-foreground capitalize">{p.preferred_irrigation || t('company.any')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('company.maxMoisture')}:</span>
                          <span className="font-medium text-foreground">{p.moisture_percentage ? `${p.moisture_percentage}%` : t('company.standard')}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Contracts & Applications + 4. Notifications Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Applications & Contracts Table (2 Cols) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{t('company.recentApplications')}</h2>
                    <p className="text-xs text-muted-foreground">{t('company.applicationsSubtitle')}</p>
                  </div>
                  <Link href="/company/contracts" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                    {t('company.viewAllContracts')} <ArrowRight className="size-3.5" />
                  </Link>
                </div>

                <Card className="border border-border/80">
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">{t('company.tableFarmer')}</th>
                          <th className="px-4 py-3">{t('company.tableFarm')}</th>
                          <th className="px-4 py-3">{t('company.tableCrop')}</th>
                          <th className="px-4 py-3">{t('company.tableAgreedVol')}</th>
                          <th className="px-4 py-3">{t('company.tableStatus')}</th>
                          <th className="px-4 py-3 text-right">{t('company.tableAction')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {contracts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">
                              {t('company.noApplications')}
                            </td>
                          </tr>
                        ) : (
                          contracts.slice(0, 5).map((c) => (
                            <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">{c.farmer_name}</td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">{c.farm_name}</td>
                              <td className="px-4 py-3 capitalize font-medium">{c.crop}</td>
                              <td className="px-4 py-3 text-xs">{c.agreed_quantity} {t('company.tonnesUnit')}</td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant={
                                    c.status === 'ACCEPTED' || c.status === 'COMPLETED'
                                      ? 'default'
                                      : c.status === 'APPLICATION_SUBMITTED'
                                      ? 'outline'
                                      : 'secondary'
                                  }
                                  className="text-[10px]"
                                >
                                  {c.status.replace(/_/g, ' ')}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Link href="/company/contracts">
                                  <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                                    {t('company.reviewBtn')}
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Notifications (1 Col) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{t('company.sourcingAlerts')}</h2>
                    <p className="text-xs text-muted-foreground">{t('company.alertsSubtitle')}</p>
                  </div>
                  <Link href="/notifications" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                    {t('company.viewAllAlerts')} <ArrowRight className="size-3.5" />
                  </Link>
                </div>

                <Card className="border border-border/80">
                  <CardContent className="p-4 space-y-3">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        {t('company.noNotifications')}
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-3 rounded-xl border border-border/60 bg-muted/20 hover:border-primary/30 transition-all text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-foreground truncate">{n.title}</span>
                            {!n.is_read && (
                              <Badge variant="default" className="text-[9px] px-1 py-0 h-3.5">
                                {t('company.newBadge')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground line-clamp-2 leading-snug">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 pt-0.5">
                            <Clock className="size-3" />
                            <span>{new Date(n.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
