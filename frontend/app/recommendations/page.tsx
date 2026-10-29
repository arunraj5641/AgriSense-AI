'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BrainCircuit,
  Sparkles,
  Zap,
  Loader2,
  Clock,
  TrendingUp,
  DollarSign,
  Tractor,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ClipboardCheck,
} from 'lucide-react';
import type { Farm, Recommendation, User, OfficerQueueItem } from '@/types';
import { useTranslation } from '@/lib/i18n';

function ConfidenceBadge({ score }: { score: number }) {
  const percent = (score * 100).toFixed(0);
  const variant = score >= 0.8 ? 'default' : score >= 0.5 ? 'secondary' : 'outline';
  return (
    <Badge variant={variant} className="gap-1">
      <TrendingUp className="size-3" />
      {percent}% confidence
    </Badge>
  );
}

export default function RecommendationsHubPage() {
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [officerItems, setOfficerItems] = useState<OfficerQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [action, setAction] = useState('apply_fertilizer');
  const [submitting, setSubmitting] = useState(false);
  const [latestResult, setLatestResult] = useState<Recommendation | null>(null);
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();

  // Universal identity & role-aware data loading
  const loadData = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      // 1. Authenticate via universal endpoint /auth/me
      const user: User = await fetchApi('/auth/me');
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);

      // 2. Role-based isolation
      if (user.role === 'food_processing_unit') {
        toast.error('Access restricted to Farmers and Extension Officers.');
        router.push('/company');
        return;
      }

      if (user.role === 'farmer') {
        // Farmer: Only farmers can fetch /farms
        const farmsData: Farm[] = await fetchApi('/farms').catch(() => []);
        setFarms(farmsData);
        if (farmsData.length > 0) {
          setSelectedFarmId(farmsData[0].id);
        }
      } else if (
        user.role === 'extension_officer' ||
        user.role === 'agronomist' ||
        user.role === 'admin'
      ) {
        // Extension Officer / Admin: Do NOT request farmer-specific endpoints (/farms)
        // Fetch recommendations from officer queue endpoint
        const queueData: OfficerQueueItem[] = await fetchApi('/recommendations/officer/queue').catch(
          () => []
        );
        setOfficerItems(queueData);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  // Load recommendations when selected farm changes (Farmer mode)
  const loadRecommendations = useCallback(async (farmId: string) => {
    if (!farmId) return;
    setLoadingRecs(true);
    try {
      const data = await fetchApi(`/recommendations/farms/${farmId}`);
      setRecommendations(data);
    } catch {
      setRecommendations([]);
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFarmId && currentUser?.role === 'farmer') {
      void Promise.resolve().then(() => loadRecommendations(selectedFarmId));
    }
  }, [selectedFarmId, currentUser?.role, loadRecommendations]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmId) {
      toast.error('Please select a farm first');
      return;
    }

    setSubmitting(true);
    try {
      const result = await fetchApi('/recommendations', {
        method: 'POST',
        body: JSON.stringify({ farm_id: selectedFarmId, target_action: action }),
      });
      setLatestResult(result);
      setRecommendations((prev) => [result, ...prev]);
      toast.success('Recommendation generated successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate recommendation';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);
  const displayedHistory = showAll ? recommendations : recommendations.slice(0, 5);

  const isOfficerOrAdmin =
    currentUser?.role === 'extension_officer' ||
    currentUser?.role === 'agronomist' ||
    currentUser?.role === 'admin';

  const pendingCount = officerItems.filter(
    (item) => item.review_status === 'PENDING' || item.status === 'UNDER_REVIEW'
  ).length;
  const approvedCount = officerItems.filter(
    (item) => item.review_status === 'APPROVED' || item.status === 'APPROVED'
  ).length;

  return (
    <AppShell
      title="AI Recommendations"
      breadcrumbs={[
        {
          label: currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'extension_officer' ? 'Officer' : 'Dashboard',
          href: currentUser?.role === 'admin' ? '/admin' : currentUser?.role === 'extension_officer' ? '/officer' : '/dashboard',
        },
        { label: 'Recommendations' },
      ]}
    >
      <div className="space-y-8 pb-12">
        <PageHeader
          breadcrumbs={[
            {
              label: currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'extension_officer' ? 'Officer' : 'Dashboard',
              href: currentUser?.role === 'admin' ? '/admin' : currentUser?.role === 'extension_officer' ? '/officer' : '/dashboard',
            },
            { label: 'AI Recommendations' },
          ]}
          title={isOfficerOrAdmin ? 'Agronomic Advisory Supervision' : 'AI Recommendations Hub'}
          badge={
            isOfficerOrAdmin ? (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 gap-1.5 font-semibold">
                <ShieldCheck className="size-3.5" />
                {currentUser?.role === 'admin' ? 'Platform Administrator' : 'Extension Officer Oversight'}
              </Badge>
            ) : null
          }
          description={
            isOfficerOrAdmin
              ? 'Supervise deterministic recommendations across all registered plots. Review algorithmic constraint telemetry and human review determinations.'
              : 'Generate and review resource-aware, deterministic recommendations for your farms.'
          }
          actions={
            isOfficerOrAdmin ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Link href="/officer">
                  <Button size="sm" className="gap-1.5 shadow-xs">
                    <ClipboardCheck className="size-3.5" />
                    Open Review Queue
                  </Button>
                </Link>
                <Link href="/reports">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    Advisory Audit
                  </Button>
                </Link>
              </div>
            ) : selectedFarm ? (
              <Link
                href={`/dashboard/${selectedFarm.id}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Manage {selectedFarm.name}
                <ArrowRight className="ml-1.5 size-3.5" />
              </Link>
            ) : null
          }
        />

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full max-w-sm rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : isOfficerOrAdmin ? (
          /* ========================================================= */
          /* EXTENSION OFFICER / ADMIN VIEW                            */
          /* ========================================================= */
          <div className="space-y-6">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
                <p className="text-xs text-muted-foreground font-medium">Total</p>
                <p className="text-2xl font-semibold text-foreground mt-0.5">{officerItems.length}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
                <p className="text-xs text-muted-foreground font-medium">Pending</p>
                <p className="text-2xl font-semibold text-foreground mt-0.5">{pendingCount}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3.5">
                <p className="text-xs text-muted-foreground font-medium">Approved</p>
                <p className="text-2xl font-semibold text-foreground mt-0.5">{approvedCount}</p>
              </div>
            </div>

            {/* Recommendations Feed across all farms */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="size-4 text-primary" />
                    <CardTitle className="text-base font-bold">Platform Advisory Feed</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {officerItems.length} {officerItems.length === 1 ? 'Advisory' : 'Advisories'} Recorded
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Deterministic engine recommendations issued to smallholders across Tamil Nadu and Punjab agro-climatic zones.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {officerItems.length === 0 ? (
                  <EmptyState
                    icon={BrainCircuit}
                    title="No recommendations generated yet"
                    description="Farmer advisory recommendations will appear here in real-time as smallholders run the deterministic engine."
                    className="border-0 bg-transparent py-8"
                  />
                ) : (
                  officerItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border/80 bg-card p-4 transition-base hover:bg-muted/30 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm">{item.farm_name}</span>
                          <span className="text-xs text-muted-foreground">• {item.farmer_name}</span>
                          {item.crops && item.crops.length > 0 && (
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {item.crops.join(', ')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <ConfidenceBadge score={item.confidence_score} />
                          <Badge
                            variant={
                              item.status === 'IMPLEMENTED' || item.review_status === 'IMPLEMENTED'
                                ? 'outline'
                                : item.status === 'APPROVED' || item.review_status === 'APPROVED'
                                ? 'default'
                                : item.status === 'NEEDS_REVISION' || item.review_status === 'NEEDS_REVISION'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className={cn(
                              'text-[10px] font-semibold',
                              (item.status === 'IMPLEMENTED' || item.review_status === 'IMPLEMENTED') &&
                                'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
                              (item.status === 'APPROVED' || item.review_status === 'APPROVED') &&
                                item.status !== 'IMPLEMENTED' &&
                                'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
                              (item.status === 'NEEDS_REVISION' || item.review_status === 'NEEDS_REVISION') &&
                                'border-amber-500/30 text-amber-400 bg-amber-500/10',
                              (item.status !== 'IMPLEMENTED' && item.status !== 'APPROVED' && item.status !== 'NEEDS_REVISION') &&
                                'border-blue-500/30 text-blue-400 bg-blue-500/10'
                            )}
                          >
                            {item.status === 'IMPLEMENTED' || item.review_status === 'IMPLEMENTED'
                              ? 'Completed'
                              : item.status === 'APPROVED' || item.review_status === 'APPROVED'
                              ? 'Approved'
                              : item.status === 'NEEDS_REVISION' || item.review_status === 'NEEDS_REVISION'
                              ? 'Needs Revision'
                              : 'Pending Review'}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <p className="font-medium text-foreground text-sm">{item.recommendation}</p>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.explanation}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                          {item.estimated_cost != null && (
                            <span className="flex items-center gap-1 font-medium text-primary">
                              <DollarSign className="size-3" />
                              Est. ${item.estimated_cost.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/recommendations/${item.id}`}
                          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-7 text-xs gap-1.5')}
                        >
                          <Sparkles className="size-3" />
                          Explanation &amp; Expert Review
                          <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ) : farms.length === 0 ? (
          /* ========================================================= */
          /* FARMER VIEW: ZERO FARMS                                   */
          /* ========================================================= */
          <EmptyState
            icon={Tractor}
            title="No farms found"
            description="You need to register a farm before you can generate deterministic AI recommendations."
            action={
              <Link href="/farms" className={cn(buttonVariants({ size: 'default' }))}>
                Go to My Farms
              </Link>
            }
          />
        ) : (
          /* ========================================================= */
          /* FARMER VIEW: ACTIVE FARM & GENERATOR                      */
          /* ========================================================= */
          <div className="space-y-6">
            {/* Farm Selector Bar */}
            <div className="flex items-center gap-3">
              <label htmlFor="farm-select" className="text-sm font-medium text-muted-foreground shrink-0">Farm:</label>
              <select
                id="farm-select"
                value={selectedFarmId}
                onChange={(e) => {
                  setSelectedFarmId(e.target.value);
                  setLatestResult(null);
                }}
                className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm font-medium transition-base focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.location} · {f.farm_size} ac)
                  </option>
                ))}
              </select>
            </div>

            {/* Recommendation Generator */}
            <Card className="border border-border/80 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Sparkles className="size-5 text-blue-400" />
                  Deterministic Recommendation Engine
                </CardTitle>
                <CardDescription className="text-xs">
                  Select a farm action to analyze constraints (crop stage, budget, equipment, irrigation, weather) and generate certified advisory insights.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerate} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="target-action-select">
                      Target Action
                    </label>
                    <select
                      id="target-action-select"
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm transition-base focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="apply_fertilizer">Fertilizer Application (NPK & Fertigation)</option>
                      <option value="irrigation">Irrigation Scheduling (Moisture Deficit & Drip)</option>
                      <option value="pest_control">Pest & Disease Control (IPM Biopesticide)</option>
                      <option value="harvest">Crop Harvesting (Combine & Shatter Control)</option>
                      <option value="machinery_hire">Machinery Hire (Custom Hiring Centre - Tractor/Tiller)</option>
                      <option value="seed_selection">Seed Selection & Treatment (Certified Resistant Stock)</option>
                      <option value="soil_amendment">Soil Amendment & Conditioning (Gypsum / FYM)</option>
                      <option value="crop_protection">Preventive Crop Protection (Sticky Traps & Biocontrol)</option>
                      <option value="post_harvest_storage">Post-Harvest Storage (Hermetic PICS / Godown)</option>
                      <option value="crop_transportation">Produce Transportation & Mandi Logistics</option>
                    </select>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full gap-2 bg-blue-600 hover:bg-blue-500 glow-blue-sm text-white font-medium">
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Analyzing farm resources &amp; running deterministic engine...
                      </>
                    ) : (
                      <>
                        <Zap className="size-4" />
                        Generate Recommendation for {selectedFarm?.name || 'Selected Farm'}
                      </>
                    )}
                  </Button>
                </form>

                {/* Latest Result */}
                {latestResult && (
                  <div className="mt-6 rounded-xl border border-blue-500/30 bg-[#111A2B]/80 p-5 animate-slide-up space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                          <BrainCircuit className="size-4" />
                        </div>
                        <h4 className="font-semibold text-sm text-foreground">New Recommendation Generated</h4>
                      </div>
                      <ConfidenceBadge score={latestResult.confidence_score} />
                    </div>
                    <Separator className="bg-border/60" />
                    <p className="font-semibold text-foreground text-sm leading-snug">{latestResult.recommendation}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {latestResult.explanation}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs">
                      {latestResult.estimated_cost != null && (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <DollarSign className="size-3.5 text-blue-400" />
                          Est. Cost: <span className="text-blue-400">${latestResult.estimated_cost}</span>
                        </span>
                      )}
                      <Link
                        href={`/recommendations/${latestResult.id}`}
                        className={cn(buttonVariants({ size: 'sm' }), 'bg-blue-600 hover:bg-blue-500 glow-blue-sm text-white font-medium gap-1.5')}
                      >
                        <Sparkles className="size-3.5" />
                        View Advisory Details
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* History */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <Clock className="size-4 text-muted-foreground" />
                    History for {selectedFarm?.name || 'Farm'}
                  </CardTitle>
                  {recommendations.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{recommendations.length} total</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingRecs ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                  </div>
                ) : recommendations.length === 0 ? (
                  <EmptyState
                    icon={BrainCircuit}
                    title="No recommendations yet for this farm"
                    description="Run the deterministic Recommendation Engine above to generate insights."
                    className="border-0 bg-transparent py-8"
                  />
                ) : (
                  <div className="space-y-3">
                    {displayedHistory.map((rec) => (
                      <div
                        key={rec.id}
                        className="rounded-xl border border-border/80 bg-muted/30 p-4 transition-base hover:bg-muted/50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm">{rec.recommendation}</p>
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {rec.explanation}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-semibold',
                                rec.status === 'IMPLEMENTED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : rec.status === 'APPROVED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : rec.status === 'NEEDS_REVISION'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              )}
                            >
                              {rec.status === 'IMPLEMENTED'
                                ? (t('status.completed') || 'Completed')
                                : rec.status === 'APPROVED'
                                ? (t('status.readyToProceed') || 'Ready to Proceed')
                                : rec.status === 'NEEDS_REVISION'
                                ? (t('status.changesRequested') || 'Changes Requested')
                                : (t('status.underReview') || 'Under Review')}
                            </Badge>
                            <ConfidenceBadge score={rec.confidence_score} />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {new Date(rec.created_at).toLocaleDateString()}
                            </span>
                            {rec.estimated_cost != null && (
                              <span className="flex items-center gap-1 font-medium text-primary">
                                <DollarSign className="size-3" />
                                ${rec.estimated_cost}
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/recommendations/${rec.id}`}
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-7 text-xs gap-1')}
                          >
                            View Advisory
                            <ArrowRight className="size-3" />
                          </Link>
                        </div>
                      </div>
                    ))}

                    {recommendations.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowAll(!showAll)}
                      >
                        {showAll ? (
                          <>
                            <ChevronUp className="mr-2 size-4" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-2 size-4" />
                            Show All ({recommendations.length - 5} more)
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
