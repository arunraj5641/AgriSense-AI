'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi, ApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { AddFarmDialog } from '@/components/dashboard/add-farm-dialog';
import { useTranslation } from '@/lib/i18n';
import {
  Tractor,
  Sprout,
  BrainCircuit,
  Plus,
  ArrowRight,
  TrendingUp,
  DollarSign,
  CloudSun,
  CloudRain,
  Wind,
  Bell,
  Handshake,
  ExternalLink,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import type { Farm, Recommendation, NotificationItem, Contract } from '@/types';

export default function Dashboard() {
  const router = useRouter();
  const { t } = useTranslation();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [latestRec, setLatestRec] = useState<Recommendation | null>(null);
  const [weather, setWeather] = useState<any>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddFarmOpen, setIsAddFarmOpen] = useState(false);

  const loadDashboardData = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      // 1. Role-based routing check
      const userMe = await fetchApi('/auth/me');
      if (userMe?.role === 'extension_officer' || userMe?.role === 'agronomist') {
        router.push('/officer');
        return;
      }
      if (userMe?.role === 'food_processing_unit') {
        router.push('/company');
        return;
      }
      if (userMe?.role === 'admin') {
        router.push('/admin');
        return;
      }

      // 2. Fetch Farmer data in parallel
      const [farmsData, notifsData, contractsData] = await Promise.all([
        fetchApi('/farms').catch(() => []),
        fetchApi('/notifications?limit=4').catch(() => []),
        fetchApi('/contracts').catch(() => [])
      ]);

      setFarms(farmsData || []);
      setNotifications(notifsData || []);
      setContracts(contractsData || []);

      // If farmer has farms, fetch latest recommendations & weather
      if (farmsData && farmsData.length > 0) {
        const primaryFarm = farmsData[0];
        const [recsData, weatherData] = await Promise.all([
          fetchApi(`/recommendations/farms/${primaryFarm.id}`).catch(() => []),
          fetchApi(`/recommendations/weather?location=${encodeURIComponent(primaryFarm.location)}`).catch(() => null)
        ]);

        if (recsData && recsData.length > 0) {
          setLatestRec(recsData[0]);
        }
        setWeather(weatherData);
      } else {
        // Fallback default weather
        const fallbackWeather = await fetchApi('/recommendations/weather?location=Thanjavur').catch(() => null);
        setWeather(fallbackWeather);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadDashboardData);
  }, [loadDashboardData]);

  const totalAcres = farms.reduce((sum, f) => sum + (f.farm_size || 0), 0);
  const activeContracts = contracts.filter(c => c.status === 'ACCEPTED' || c.status === 'IN_PROGRESS').length;

  return (
    <AppShell
      title={t('nav.dashboard')}
      breadcrumbs={[{ label: t('nav.dashboard') }]}
    >
      <div className="space-y-8 pb-12">
        <PageHeader
          breadcrumbs={[{ label: t('nav.dashboard') || 'Dashboard' }]}
          title="Dashboard"
          description="Your farm overview, active advisories, and weather conditions."
          actions={
            <>
              <Link href="/recommendations">
                <Button size="sm" className="gap-2">
                  <Sparkles className="size-3.5" />
                  Generate Advisory
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setIsAddFarmOpen(true)} className="gap-2">
                <Plus className="size-3.5" />
                Add Farm
              </Button>
            </>
          }
        />

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-48 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-56 rounded-xl" />
              <Skeleton className="h-56 rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            {/* KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-blue-500/35 transition-base relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">Farms</span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <Tractor className="size-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{farms.length}</p>
                <div className="mt-2.5 h-0.5 w-8 rounded-full bg-blue-500/70" />
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-emerald-500/35 transition-base relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">Total Acreage</span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Sprout className="size-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {totalAcres.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">ac</span>
                </p>
                <div className="mt-2.5 h-0.5 w-8 rounded-full bg-emerald-500/70" />
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-indigo-500/35 transition-base relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">Active Contracts</span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Handshake className="size-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{activeContracts}</p>
                <div className="mt-2.5 h-0.5 w-8 rounded-full bg-indigo-500/70" />
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-amber-500/35 transition-base relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">Temperature</span>
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                    <CloudSun className="size-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {weather?.temperature ?? 28}°<span className="text-sm font-normal text-muted-foreground">C</span>
                </p>
                <div className="mt-2.5 h-0.5 w-8 rounded-full bg-amber-500/70" />
              </div>
            </div>

            {/* Active Recommendation */}
            <section>
              {latestRec ? (
                <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm hover:border-blue-500/30 transition-base">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-3 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
                          <BrainCircuit className="size-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Active Advisory</span>
                      </div>
                      
                      <div className="rounded-lg bg-[#111A2B]/70 border border-border/70 p-3.5">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground leading-snug">
                          {latestRec.recommendation}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed mt-1.5">
                          {latestRec.explanation}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground/80">
                        <span className="flex items-center gap-1.5">
                          <TrendingUp className="size-3.5 text-blue-400" />
                          <span className="font-medium text-foreground">{(latestRec.confidence_score * 100).toFixed(0)}%</span> confidence
                        </span>
                        {latestRec.estimated_cost != null && (
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="size-3.5 text-blue-400" />
                            Est. <span className="font-medium text-foreground">${latestRec.estimated_cost.toLocaleString()}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-muted-foreground/60" />
                          {new Date(latestRec.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <Link href={`/recommendations/${latestRec.id}`} className="shrink-0 self-center sm:self-start">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-500 glow-blue-sm text-white font-medium gap-1.5 text-xs h-9 px-4">
                        View Details
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border/80 bg-card p-8 text-center shadow-sm">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mx-auto mb-3">
                    <BrainCircuit className="size-6" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No active advisory</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Generate your first recommendation to get tailored farming advice based on your soil and resources.
                  </p>
                  <Link href="/recommendations" className="inline-block mt-4">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 glow-blue-sm text-white font-medium gap-2">
                      <Sparkles className="size-3.5" />
                      Run Advisory Engine
                    </Button>
                  </Link>
                </div>
              )}
            </section>

            {/* Two-column: Weather + Farms or Contracts + Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weather & Farm Overview */}
              <div className="space-y-6">
                {/* Weather */}
                <Card className="border-border/80 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CloudSun className="size-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Weather</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 font-mono">
                        {weather?.source || 'Agro-Climatic'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-semibold text-foreground">
                        {weather?.temperature ?? 28}°C
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {weather?.condition || 'Clear Skies'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CloudRain className="size-3 text-muted-foreground/60" />
                        {weather?.rainfall_mm ?? 0} mm
                      </span>
                      <span className="flex items-center gap-1">
                        <Wind className="size-3 text-muted-foreground/60" />
                        {weather?.wind_speed_kmh ?? 10} km/h
                      </span>
                    </div>
                    {weather?.forecast_outlook && (
                      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                        {weather.forecast_outlook}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Farms */}
                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="pb-3 px-5 pt-5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">My Farms</CardTitle>
                      <Link href="/farms" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                        View all <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0">
                    {farms.length > 0 ? (
                      <div className="space-y-1.5">
                        {farms.slice(0, 3).map((f) => (
                          <Link
                            key={f.id}
                            href={`/dashboard/${f.id}`}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors group"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{f.name}</p>
                              <p className="text-xs text-muted-foreground">{f.location} · {f.farm_size} ac</p>
                            </div>
                            <span className="text-[11px] text-muted-foreground capitalize">{f.irrigation_type || 'Rainfed'}</span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Tractor className="size-6 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No farms registered yet.</p>
                        <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setIsAddFarmOpen(true)}>
                          <Plus className="mr-1.5 size-3" />
                          Add Your First Farm
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Contracts & Notifications */}
              <div className="space-y-6">
                {/* Contracts */}
                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="pb-3 px-5 pt-5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Contracts</CardTitle>
                      <Link href="/contracts" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                        View all <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0">
                    {contracts.length > 0 ? (
                      <div className="space-y-1.5">
                        {contracts.slice(0, 3).map((c) => (
                          <div key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground capitalize truncate">{c.crop} Agreement</p>
                              <p className="text-xs text-muted-foreground">{c.agreed_quantity} MT · ${c.agreed_price}/MT</p>
                            </div>
                            <Badge
                              variant={c.status === 'ACCEPTED' || c.status === 'COMPLETED' ? 'default' : 'secondary'}
                              className="text-[10px] font-medium"
                            >
                              {c.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Handshake className="size-6 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No active contracts.</p>
                        <Link href="/contracts">
                          <Button size="sm" variant="outline" className="text-xs mt-3">
                            Browse Opportunities
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notifications */}
                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="pb-3 px-5 pt-5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Recent Alerts</CardTitle>
                      <Link href="/notifications" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                        View all <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0">
                    {notifications.length > 0 ? (
                      <div className="space-y-1.5">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              {!n.is_read && (
                                <span className="size-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{n.message}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
                              {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        No recent alerts.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>

      <AddFarmDialog
        open={isAddFarmOpen}
        onOpenChange={setIsAddFarmOpen}
        onSuccess={() => {
          setIsAddFarmOpen(false);
          void loadDashboardData();
        }}
      />
    </AppShell>
  );
}
