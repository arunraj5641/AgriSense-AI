'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BrainCircuit,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Clock,
  BookOpen,
  UserCheck,
  Send,
  ExternalLink,
  ChevronLeft,
  Calendar,
  Sparkles,
  Info,
  Layers,
  ArrowDown,
  Loader2,
  Tractor,
  Sprout,
  ShieldCheck,
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  CloudSun,
  Eye,
  ChevronRight,
  ListFilter
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type {
  RecommendationDetail,
  RecommendationReview,
  User,
  ReviewStatus,
} from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

type TabType = 'overview' | 'snapshot' | 'explanation' | 'evidence' | 'history';

export default function RecommendationDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const recId = resolvedParams.id;
  const router = useRouter();
  const { t } = useTranslation();

  const [detail, setDetail] = useState<RecommendationDetail | null>(null);
  const [reviews, setReviews] = useState<RecommendationReview[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab & View Mode state
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [officerShowAll, setOfficerShowAll] = useState(false);
  const [expandedConstraint, setExpandedConstraint] = useState<string | null>(null);

  // Review Form state
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('APPROVED');
  const [overrideReason, setOverrideReason] = useState<string>('AGRONOMIC_JUDGMENT');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [implementing, setImplementing] = useState(false);

  const loadData = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const [detailData, userMe, reviewsData] = await Promise.all([
        fetchApi(`/recommendations/${recId}`),
        fetchApi('/auth/me').catch(() => null),
        fetchApi(`/recommendations/${recId}/reviews`).catch(() => []),
      ]);

      setDetail(detailData);
      if (userMe) setCurrentUser(userMe);
      setReviews(reviewsData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load recommendation details';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [recId, router]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewStatus === 'NEEDS_REVISION') {
      if (!overrideReason) {
        toast.error('Please select a reason for revision.');
        return;
      }
      if (!reviewComment.trim()) {
        toast.error('Please provide revision instructions for the farmer.');
        return;
      }
    }

    setSubmittingReview(true);
    try {
      const newReview: RecommendationReview = await fetchApi(`/recommendations/${recId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status: reviewStatus,
          comment: reviewComment.trim(),
          override_reason: reviewStatus === 'NEEDS_REVISION' ? overrideReason : undefined,
        }),
      });

      toast.success(
        reviewStatus === 'APPROVED'
          ? (t('review.approvedTitle') || 'Recommendation officially approved!')
          : (t('review.revisionTitle') || 'Revision request recorded.')
      );
      setReviewComment('');
      setReviews((prev) => [newReview, ...prev]);
      if (detail) {
        setDetail({
          ...detail,
          latest_review: newReview,
          recommendation: {
            ...detail.recommendation,
            status: reviewStatus === 'APPROVED' ? 'APPROVED' : 'NEEDS_REVISION',
          },
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      if (
        errMsg.toLowerCase().includes('already been implemented') ||
        errMsg.toLowerCase().includes('already been completed')
      ) {
        toast.info('This recommendation has already been completed.');
        await loadData();
        return;
      }
      if (errMsg.toLowerCase().includes('already been reviewed') || errMsg.toLowerCase().includes('already approved')) {
        toast.info('This recommendation has already been reviewed.');
        await loadData();
        return;
      }
      const defaultErr = reviewStatus === 'APPROVED'
        ? (t('review.approveError') || 'Could not approve this recommendation. Please try again.')
        : (t('review.revisionError') || 'Could not submit revision request. Please try again.');
      const message = errMsg || defaultErr;
      toast.error(message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleImplementRecommendation = async () => {
    setImplementing(true);
    try {
      const updatedRec = await fetchApi(`/recommendations/${recId}/implement`, {
        method: 'POST',
      });
      toast.success(t('status.completed') ? 'Recommendation marked as completed!' : 'Recommendation marked as completed!');
      if (detail) {
        setDetail({
          ...detail,
          recommendation: {
            ...detail.recommendation,
            status: 'IMPLEMENTED',
            implemented_at: updatedRec.implemented_at || new Date().toISOString(),
            implemented_by_id: updatedRec.implemented_by_id,
          },
        });
      }
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not complete recommendation. Please try again.';
      toast.error(message);
    } finally {
      setImplementing(false);
    }
  };

  const isOfficer =
    currentUser?.role?.toLowerCase() === 'extension_officer' ||
    currentUser?.role?.toLowerCase() === 'agronomist';

  if (loading) {
    return (
      <AppShell
        title="Recommendation Details"
        breadcrumbs={[
          { label: 'Recommendations', href: '/recommendations' },
          { label: 'Details' },
        ]}
      >
        <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (!detail) {
    return (
      <AppShell
        title="Recommendation Not Found"
        breadcrumbs={[
          { label: 'Recommendations', href: '/recommendations' },
          { label: 'Details' },
        ]}
      >
        <Card className="max-w-xl mx-auto text-center p-8">
          <BrainCircuit className="size-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold">Recommendation Not Found</h2>
          <p className="text-sm text-muted-foreground mt-2">
            The requested recommendation does not exist or you do not have permission to view it.
          </p>
          <Link
            href="/recommendations"
            className={cn(buttonVariants({ variant: 'default' }), 'mt-6 inline-flex')}
          >
            <ChevronLeft className="mr-2 size-4" />
            Back to Recommendations
          </Link>
        </Card>
      </AppShell>
    );
  }

  const { recommendation: rec, explanation: xai, sources, latest_review: latestReview } = detail;
  const rawWeather = xai?.resource_snapshot?.weather as Record<string, any> | undefined;

  // Status color helper
  const getStatusBadge = (status?: ReviewStatus | string, recStatus?: string) => {
    if (recStatus === 'IMPLEMENTED' || status === 'IMPLEMENTED') {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 gap-1.5 px-3 py-1 font-semibold">
          <CheckCircle2 className="size-4 text-emerald-400" />
          {t('status.completed') || 'Completed'}
        </Badge>
      );
    }
    if (recStatus === 'APPROVED' || status === 'APPROVED') {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 gap-1.5 px-3 py-1 font-semibold">
          <CheckCircle2 className="size-4 text-emerald-400" />
          {isOfficer ? 'Approved' : (t('status.readyToProceed') || 'Ready to Proceed')}
        </Badge>
      );
    }
    if (recStatus === 'NEEDS_REVISION' || status === 'NEEDS_REVISION') {
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 gap-1.5 px-3 py-1 font-semibold">
          <AlertTriangle className="size-4 text-amber-400" />
          {isOfficer ? 'Needs Revision' : (t('status.changesRequested') || 'Changes Requested')}
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 gap-1.5 px-3 py-1 font-semibold">
        <Clock className="size-4 text-blue-400" />
        {isOfficer ? 'Pending Review' : (t('status.underReview') || 'Under Review')}
      </Badge>
    );
  };

  const tabs: { id: TabType; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: t('tabs.overview') || 'Overview', icon: Sparkles },
    { id: 'snapshot', label: isOfficer ? 'Resources & Constraints' : 'Farm Resources & Weather', icon: Sprout },
    { id: 'explanation', label: isOfficer ? 'Decision Breakdown' : 'Agronomic Guidance', icon: BrainCircuit, count: xai?.constraints?.length },
    { id: 'evidence', label: isOfficer ? 'Evidence Base' : 'Scientific Citations', icon: BookOpen, count: sources?.length },
    { id: 'history', label: isOfficer ? 'Reviews & Audit' : 'Review History', icon: Clock, count: reviews.length },
  ];

  return (
    <AppShell
      title={isOfficer ? 'Decision Explanation & Expert Review' : 'Advisory Details & Guidance'}
      breadcrumbs={[
        { label: 'Recommendations', href: '/recommendations' },
        { label: 'Details' },
      ]}
    >
      <div className="space-y-8 pb-12">
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Recommendations', href: '/recommendations' },
            { label: `Advisory #${recId.slice(0, 6).toUpperCase()}` },
          ]}
          title={isOfficer ? 'Decision Explanation & Expert Review' : 'Advisory Details & Guidance'}
          description={
            isOfficer
              ? 'Transparent algorithmic evaluation, agronomic constraint telemetry, and certified expert review.'
              : 'Resource-aware farm advisory, input requirements, and field execution guidance.'
          }
          badge={
            <div className="flex items-center gap-2">
              {getStatusBadge(latestReview?.status, rec.status)}
              {isOfficer && rec.is_high_impact && (
                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 px-2.5 py-1 text-xs font-semibold">
                  <AlertTriangle className="size-3.5 text-rose-500" />
                  HIGH IMPACT
                </Badge>
              )}
            </div>
          }
          actions={
            <>
              <Link
                href="/recommendations"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                <ChevronLeft className="mr-1 size-3.5" />
                Back to Recommendations
              </Link>
              {isOfficer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOfficerShowAll(!officerShowAll)}
                  className="text-xs font-medium gap-1.5"
                >
                  <ListFilter className="size-3.5" />
                  {officerShowAll ? 'Tabbed View' : 'All-in-One View'}
                </Button>
              )}
            </>
          }
        />

        {/* ========================================================= */}
        {/* WORKFLOW PIPELINE                                         */}
        {/* ========================================================= */}
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {isOfficer ? 'Governance Pipeline' : 'Advisory Process'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs overflow-x-auto">
            {/* Steps */}
            {(isOfficer
              ? [
                  { label: 'AI Generated', done: true },
                  { label: 'Constraints Evaluated', done: true },
                  { label: rec.is_high_impact ? 'High-Impact Assessed' : 'Standard Impact', done: true },
                  {
                    label: 'Officer Review',
                    done:
                      rec.status === 'APPROVED' ||
                      rec.status === 'IMPLEMENTED' ||
                      latestReview?.status === 'APPROVED' ||
                      latestReview?.status === 'NEEDS_REVISION',
                    active:
                      (!latestReview?.status || latestReview?.status === 'PENDING') &&
                      rec.status !== 'IMPLEMENTED',
                  },
                  {
                    label: 'Farmer Implementation',
                    done: rec.status === 'IMPLEMENTED',
                    active:
                      (rec.status === 'APPROVED' || latestReview?.status === 'APPROVED') &&
                      rec.status !== 'IMPLEMENTED',
                  },
                ]
              : [
                  { label: 'Advisory Generated', done: true },
                  { label: 'Farm Feasibility Checked', done: true },
                  {
                    label: 'Expert Review',
                    done:
                      rec.status === 'APPROVED' ||
                      rec.status === 'IMPLEMENTED' ||
                      latestReview?.status === 'APPROVED' ||
                      latestReview?.status === 'NEEDS_REVISION',
                    active:
                      (!latestReview?.status || latestReview?.status === 'PENDING') &&
                      rec.status !== 'IMPLEMENTED',
                  },
                  {
                    label: rec.status === 'IMPLEMENTED' ? 'Completed' : 'Ready to Carry Out',
                    done: rec.status === 'IMPLEMENTED',
                    active:
                      (rec.status === 'APPROVED' || latestReview?.status === 'APPROVED') &&
                      rec.status !== 'IMPLEMENTED',
                  },
                ]
            ).map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-1 shrink-0">
                <div
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full text-[10px] font-bold',
                    step.done
                      ? 'bg-primary/15 text-primary'
                      : step.active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step.done ? '✓' : i + 1}
                </div>
                <span
                  className={cn(
                    'font-medium whitespace-nowrap',
                    step.done
                      ? 'text-foreground'
                      : step.active
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
                {i < arr.length - 1 && (
                  <div
                    className={cn(
                      'w-6 h-px mx-1',
                      step.done ? 'bg-primary/30' : 'bg-border'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ALWAYS VISIBLE OFFICER DETAILS */}
        <div className="rounded-xl border border-border/80 bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <UserCheck className="size-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">
                  {latestReview?.reviewer_name
                    ? (isOfficer ? latestReview.reviewer_name : `Extension Officer (${latestReview.reviewer_name})`)
                    : isOfficer
                    ? 'Awaiting Officer Assignment'
                    : 'Agricultural Extension Service'}
                </span>
                {getStatusBadge(latestReview?.status, rec.status)}
              </div>
              <p className="text-xs text-muted-foreground">
                {latestReview?.comment ? (
                  <span className="italic">“{latestReview.comment}”</span>
                ) : isOfficer ? (
                  <span>Pending official agronomic review.</span>
                ) : (
                  <span>Review in progress before this action can proceed.</span>
                )}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('history')}
            className="text-xs font-medium gap-1.5 shrink-0 border-border/80 bg-[#111A2B] hover:bg-[#1A263D]"
          >
            <Clock className="size-3.5" />
            {isOfficer ? `History (${reviews.length})` : 'Review History'}
          </Button>
        </div>

        {/* Tab Navigation Controls (Visible when not in All-in-One Mode) */}
        {!officerShowAll && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0A0F1D] border border-border/70 overflow-x-auto scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-base whitespace-nowrap',
                    isActive
                      ? 'bg-[#111A2B] text-foreground font-semibold shadow-xs border border-blue-500/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-[#111A2B]/40'
                  )}
                >
                  <Icon className={cn('size-3.5', isActive ? 'text-blue-400' : '')} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW (Farmer Decision View)                     */}
        {/* ========================================================= */}
        {(activeTab === 'overview' || officerShowAll) && (
          <div className="space-y-6">
            <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <BrainCircuit className="size-6" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                        {rec.target_action ? rec.target_action.replace(/_/g, ' ') : 'AgriSense Advisory'}
                      </span>
                      <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
                        {rec.recommendation}
                      </CardTitle>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1.5 px-3 py-1 text-sm bg-background/80">
                      <TrendingUp className="size-3.5 text-primary" />
                      {(rec.confidence_score * 100).toFixed(0)}% Confidence
                    </Badge>
                    {rec.estimated_cost != null && (
                      <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-sm">
                        <DollarSign className="size-3.5 text-emerald-600" />
                        Est. Cost: ${rec.estimated_cost.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-2 space-y-5">
                {/* Primary Reason Callout */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                    Primary Agronomic Reason
                  </h4>
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {xai?.decision_summary?.reason || rec.explanation}
                  </p>
                </div>

                {/* Overview Quick Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border border-border bg-card/60">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">Target Action</span>
                    <p className="text-sm font-bold text-foreground mt-0.5 capitalize">
                      {rec.target_action ? rec.target_action.replace(/_/g, ' ') : 'General'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-card/60">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">Weather Status</span>
                    <p className="text-sm font-bold text-foreground mt-0.5 flex items-center gap-1">
                      <CloudSun className="size-3.5 text-amber-500" />
                      {rawWeather?.condition || 'Clear / Nominal'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-card/60">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">Crop Growth Stage</span>
                    <p className="text-sm font-bold text-foreground mt-0.5 capitalize">
                      {xai?.resource_snapshot?.crop_stage || 'Active'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-card/60">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">Certified Review</span>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {latestReview?.status ? latestReview.status.replace(/_/g, ' ') : 'Pending'}
                    </p>
                  </div>
                </div>

                {/* Actionable Readiness Card */}
                {(() => {
                  const isAlreadyImplemented = rec.status === 'IMPLEMENTED';
                  const isReadyToImplement = (rec.status === 'APPROVED' || latestReview?.status === 'APPROVED') && !isAlreadyImplemented;
                  const isNeedsRevision = (rec.status === 'NEEDS_REVISION' || latestReview?.status === 'NEEDS_REVISION') && !isAlreadyImplemented;
                  const isAwaitingReview = !isReadyToImplement && !isAlreadyImplemented && !isNeedsRevision;

                  return (
                    <div className="p-4 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          {isAlreadyImplemented ? (
                            <CheckCircle2 className="size-4 text-emerald-400" />
                          ) : isReadyToImplement ? (
                            <CheckCircle2 className="size-4 text-emerald-400" />
                          ) : isNeedsRevision ? (
                            <AlertTriangle className="size-4 text-amber-400" />
                          ) : (
                            <Clock className="size-4 text-blue-400" />
                          )}
                          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                            {isAlreadyImplemented
                              ? (t('status.completed') || 'Completed')
                              : isReadyToImplement
                              ? (t('status.readyToProceed') || 'Ready to Proceed')
                              : isNeedsRevision
                              ? (t('status.changesRequested') || 'Changes Requested')
                              : (t('status.underReview') || 'Under Expert Review')}
                          </span>
                          {isOfficer && rec.is_high_impact && (
                            <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px] py-0 px-1.5 font-semibold">
                              High Impact Advisory
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {isAlreadyImplemented
                            ? `This recommendation was completed on your farm${rec.implemented_at ? ` on ${new Date(rec.implemented_at).toLocaleDateString()}` : ''}.`
                            : isReadyToImplement
                            ? 'This recommendation has been reviewed and approved. You can now carry it out on your farm.'
                            : isNeedsRevision
                            ? 'Our agronomy team requested adjustments before this recommendation can proceed. An updated advisory will be prepared.'
                            : 'Expert review is required before this recommendation can be carried out. You will be notified once it is ready.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isAlreadyImplemented ? (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1.5 font-semibold gap-1.5">
                            <CheckCircle2 className="size-3.5 text-emerald-400" />
                            {t('status.completed') || 'Completed'}
                          </Badge>
                        ) : isReadyToImplement ? (
                          <Button
                            size="sm"
                            disabled={implementing}
                            onClick={handleImplementRecommendation}
                            className="shrink-0 font-semibold text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 text-white shadow-sm glow-blue-sm"
                          >
                            {implementing ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Marking as Completed...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-3.5" />
                                {t('action.markCompleted') || 'Mark as Completed'}
                              </>
                            )}
                          </Button>
                        ) : isNeedsRevision ? (
                          <Button
                            size="sm"
                            disabled
                            variant="outline"
                            className="shrink-0 font-semibold text-xs gap-1.5 opacity-75 cursor-not-allowed text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10"
                          >
                            <AlertTriangle className="size-3.5 text-amber-600" />
                            {t('action.changesRequested') || 'Changes Requested'}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled
                            variant="outline"
                            className="shrink-0 font-semibold text-xs gap-1.5 opacity-75 cursor-not-allowed text-muted-foreground border-border bg-muted/40"
                          >
                            <Clock className="size-3.5" />
                            {t('action.awaitingReview') || 'Awaiting Review'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Primary Navigation Actions for Farmers */}
                {!officerShowAll && (
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => setActiveTab('explanation')}
                      className="gap-2 font-semibold shadow-sm"
                    >
                      <BrainCircuit className="size-4" />
                      View Decision Breakdown
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('snapshot')}
                      className="gap-2 font-medium"
                    >
                      <Sprout className="size-4 text-emerald-600" />
                      Inspect Farm Resources & Weather
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab('evidence')}
                      className="gap-2 text-muted-foreground"
                    >
                      <BookOpen className="size-4" />
                      Scientific Citations ({sources?.length || 0})
                    </Button>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border/50">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    Generated on {new Date(rec.created_at).toLocaleDateString()} at{' '}
                    {new Date(rec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Layers className="size-3.5" />
                    Advisory Ref: #{rec.id.slice(0, 6).toUpperCase()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: RESOURCE SNAPSHOT (Resources, Soil & Weather)       */}
        {/* ========================================================= */}
        {(activeTab === 'snapshot' || officerShowAll) && (
          <div className="space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sprout className="size-5 text-primary" />
                  <CardTitle className="text-lg">{t('snapshot.title')}</CardTitle>
                </div>
                <CardDescription>{t('snapshot.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 6 Grid Dimensions: Farm Size, Budget, Equipment, Soil, Irrigation, Weather */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* 1. Farm Size */}
                  <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-muted-foreground mb-2">
                      <span className="text-xs font-semibold uppercase">{t('snapshot.farmSize')}</span>
                      <Tractor className="size-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-foreground">
                        {xai?.resource_snapshot?.farm_size ?? 'N/A'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1.5">acres</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Operational plot boundary considered for equipment maneuvering.
                    </p>
                  </div>

                  {/* 2. Budget & Cash */}
                  <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-muted-foreground mb-2">
                      <span className="text-xs font-semibold uppercase">{t('snapshot.budget')}</span>
                      <DollarSign className="size-4 text-emerald-600" />
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-foreground">
                        ${typeof xai?.resource_snapshot?.budget === 'number'
                          ? xai.resource_snapshot.budget.toLocaleString()
                          : xai?.resource_snapshot?.budget ?? '0'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1.5">cash</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Available working capital for farm inputs and contractor hire.
                    </p>
                  </div>

                  {/* 3. Machinery & Equipment */}
                  <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-muted-foreground mb-2">
                      <span className="text-xs font-semibold uppercase">{t('snapshot.machinery')}</span>
                      <Layers className="size-4 text-primary" />
                    </div>
                    <div className="flex flex-wrap gap-1.5 my-1">
                      {xai?.resource_snapshot?.machinery && xai.resource_snapshot.machinery.length > 0 ? (
                        xai.resource_snapshot.machinery.map((m: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs font-medium capitalize bg-background">
                            {m}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No heavy equipment registered</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Determines mechanized vs manual advisory viability.
                    </p>
                  </div>

                  {/* 4. Soil Nutrients */}
                  <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-muted-foreground mb-2">
                      <span className="text-xs font-semibold uppercase">{t('snapshot.soilNutrients')}</span>
                      <Sprout className="size-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-mono text-sm font-bold text-foreground">
                        <span>N: {xai?.resource_snapshot?.soil_nutrients?.nitrogen || 'Med'}</span>
                        <span>•</span>
                        <span>P: {xai?.resource_snapshot?.soil_nutrients?.phosphorus || 'Med'}</span>
                        <span>•</span>
                        <span>K: {xai?.resource_snapshot?.soil_nutrients?.potassium || 'Med'}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] mt-2 font-semibold">
                        {xai?.resource_snapshot?.soil_nutrients?.status || 'Adequate Fertility'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Chemical fertility profile derived from recent soil test analysis.
                    </p>
                  </div>

                  {/* 5. Irrigation Setup */}
                  <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-muted-foreground mb-2">
                      <span className="text-xs font-semibold uppercase">{t('snapshot.irrigation')}</span>
                      <Droplets className="size-4 text-blue-600" />
                    </div>
                    <div>
                      <span className="text-xl font-bold text-foreground capitalize">
                        {xai?.resource_snapshot?.irrigation_method || 'Rainfed'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Water conveyance infrastructure and supplemental moisture guarantee.
                    </p>
                  </div>

                  {/* 6. Agro-Weather Snapshot (Part 2) */}
                  <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-muted-foreground mb-2">
                      <span className="text-xs font-semibold uppercase">{t('snapshot.weather')}</span>
                      <CloudSun className="size-4 text-amber-500" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground">
                          {rawWeather?.temperature ?? 28}°C
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {rawWeather?.condition ?? 'Clear'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground font-mono mt-1.5">
                        <span className="flex items-center gap-1">
                          <CloudRain className="size-3" /> {rawWeather?.rainfall_mm ?? 0} mm rain
                        </span>
                        <span className="flex items-center gap-1">
                          <Wind className="size-3" /> {rawWeather?.wind_speed_kmh ?? 10} km/h
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] mt-2 font-mono">
                        {rawWeather?.source ?? 'AgroClimatic Baseline'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {rawWeather?.reason || 'Atmospheric parameters within seasonal thresholds.'}
                    </p>
                  </div>
                </div>

                {/* Influence Explanation */}
                {xai?.resource_snapshot?.influence_explanation && (
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/80">
                    <h5 className="font-semibold text-xs text-foreground uppercase tracking-wider mb-1.5">
                      {t('snapshot.influenceTitle')}
                    </h5>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {xai.resource_snapshot.influence_explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: EXPLANATION (XAI, Constraints & Alternatives)       */}
        {/* ========================================================= */}
        {(activeTab === 'explanation' || officerShowAll) && (
          <div className="space-y-6">
            {/* Decision Summary & Bottleneck */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="size-5 text-primary" />
                  <CardTitle className="text-lg">{t('xai.title')}</CardTitle>
                </div>
                <CardDescription>{t('xai.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Decision Summary Banner */}
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                      {t('xai.decisionSummary')}
                    </span>
                    {xai?.decision_summary?.key_bottleneck && (
                      <Badge variant="destructive" className="text-xs gap-1 font-semibold">
                        <AlertTriangle className="size-3.5" />
                        {t('xai.bottleneck')}: {xai.decision_summary.key_bottleneck}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground font-medium leading-relaxed">
                    {xai?.decision_summary?.reason || rec.explanation}
                  </p>
                </div>

                {/* Decision Factor Chips */}
                {xai?.decision_factors && xai.decision_factors.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                      {t('xai.decisionFactors')}
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {xai.decision_factors.map((factor: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="px-3 py-1 text-xs font-medium bg-muted/60 border border-border"
                        >
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collapsible / Accordion Constraint Evaluation Table */}
                <div>
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {t('xai.constraintsTable')}
                  </h5>
                  <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                    {xai?.constraints?.map((c) => {
                      const isExpanded = expandedConstraint === c.name;
                      return (
                        <div key={c.name} className="bg-card transition-colors">
                          <button
                            type="button"
                            onClick={() => setExpandedConstraint(isExpanded ? null : c.name)}
                            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {c.passed ? (
                                <CheckCircle2 className="size-4 text-emerald-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="size-4 text-rose-600 flex-shrink-0" />
                              )}
                              <div>
                                <span className="font-semibold text-sm text-foreground">{c.name}</span>
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {c.explanation}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 flex-shrink-0">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs font-semibold',
                                  c.passed
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                                )}
                              >
                                {c.passed ? t('xai.passed') : t('xai.failed')}
                              </Badge>
                              <ChevronRight
                                className={cn(
                                  'size-4 text-muted-foreground transition-transform',
                                  isExpanded && 'rotate-90'
                                )}
                              />
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-1 bg-muted/20 border-t border-border/50 text-xs space-y-2">
                              <p className="text-muted-foreground font-medium leading-relaxed">
                                {c.explanation}
                              </p>
                              {Boolean(c.details) && typeof c.details === 'object' && (
                                <pre className="p-2.5 rounded-lg bg-background border border-border/60 text-[11px] font-mono text-muted-foreground overflow-x-auto">
                                  {JSON.stringify(c.details, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Confidence Score Breakdown */}
                {xai?.confidence_breakdown && (
                  <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('xai.confidenceBreakdown')}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {xai.confidence_breakdown.overall_percentage}% Overall Score
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      {xai.confidence_breakdown.items?.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-background text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {item.passed ? (
                              <CheckCircle2 className="size-3.5 text-emerald-600" />
                            ) : (
                              <XCircle className="size-3.5 text-rose-600" />
                            )}
                            <span className="font-medium text-foreground">{item.factor}</span>
                          </div>
                          <span
                            className={cn(
                              'font-mono font-semibold',
                              item.impact.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'
                            )}
                          >
                            {item.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                      {xai.confidence_breakdown.summary}
                    </p>
                  </div>
                )}

                {/* Adaptive Alternative Recommendation */}
                {xai?.alternative && (
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('xai.alternativeTitle')}
                      </span>
                      {xai.alternative.estimated_cost_difference != null && (
                        <Badge variant="outline" className="text-xs font-medium">
                          {t('xai.costDifference')}: ${Math.abs(xai.alternative.estimated_cost_difference).toLocaleString()}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-background border border-border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('xai.primaryPath')}</span>
                        <p className="text-xs font-medium text-foreground mt-1">
                          {xai.alternative.primary_recommendation}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">{t('xai.alternativePath')}</span>
                        <p className="text-xs font-medium text-foreground mt-1">
                          {xai.alternative.alternative_recommendation}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {xai.alternative.reason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SCIENTIFIC EVIDENCE (ICAR, FAO, TNAU, Literature)   */}
        {/* ========================================================= */}
        {(activeTab === 'evidence' || officerShowAll) && (
          <div className="space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-5 text-primary" />
                  <CardTitle className="text-lg">{t('references.title')}</CardTitle>
                </div>
                <CardDescription>{t('references.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                {(!sources || sources.length === 0) ? (
                  <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-xl border-border">
                    No scientific citations linked yet. Authoritative ICAR/TNAU standard operational protocols apply.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sources.map((src, i) => (
                      <div
                        key={src.id || i}
                        className="p-4 rounded-xl border border-border bg-card/60 flex flex-col justify-between hover:border-primary/40 transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <Badge variant="secondary" className="text-[10px] font-semibold">
                              {src.organization}
                            </Badge>
                            {src.crop && (
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {src.crop}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-foreground mb-1.5 leading-snug">
                            {src.title}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {src.description}
                          </p>
                        </div>
                        {src.url && (
                          <div className="pt-3 mt-3 border-t border-border/50">
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                            >
                              <span>{t('references.viewSource')}</span>
                              <ExternalLink className="size-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: HISTORY (Timeline, Officer Form & Audit Trail)       */}
        {/* ========================================================= */}
        {(activeTab === 'history' || officerShowAll) && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Officer Form (Col 1) */}
              <div className="md:col-span-1">
                <Card className="shadow-sm border-primary/20 bg-gradient-to-b from-card to-primary/5 h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <UserCheck className="size-5 text-primary" />
                      <CardTitle className="text-lg">{t('review.title')}</CardTitle>
                    </div>
                    <CardDescription>{t('review.subtitle')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isOfficer ? (
                      rec.status === 'IMPLEMENTED' ? (
                        <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-2">
                          <CheckCircle2 className="size-8 text-emerald-400 mx-auto" />
                          <h5 className="font-semibold text-sm text-foreground">
                            Recommendation Completed
                          </h5>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            This recommendation has already been carried out on the farm. Further expert reviews are closed.
                          </p>
                        </div>
                      ) : rec.status === 'APPROVED' ? (
                        <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-2">
                          <CheckCircle2 className="size-8 text-emerald-600 mx-auto" />
                          <h5 className="font-semibold text-sm text-foreground">
                            Recommendation Officially Approved
                          </h5>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            This recommendation has already been reviewed and approved. The farmer can now proceed to carry it out.
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleSubmitReview} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="review-status-select">
                              {t('review.actionLabel')}
                            </label>
                            <select
                              id="review-status-select"
                              value={reviewStatus}
                              onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}
                              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm transition-base focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="APPROVED">Approve Recommendation</option>
                              <option value="NEEDS_REVISION">Request Revision</option>
                            </select>
                          </div>

                          {reviewStatus === 'NEEDS_REVISION' && (
                            <div className="space-y-2 animate-fade-in">
                              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="override-reason-select">
                                {t('review.revisionReason') || 'Reason for Revision'}
                              </label>
                              <select
                                id="override-reason-select"
                                value={overrideReason}
                                onChange={(e) => setOverrideReason(e.target.value)}
                                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm transition-base focus:outline-none focus:ring-2 focus:ring-ring"
                              >
                                <option value="AGRONOMIC_JUDGMENT">Agronomic Assessment</option>
                                <option value="RESOURCE_CONSTRAINT">Resource Constraint</option>
                                <option value="WEATHER_CONDITION">Weather Condition</option>
                                <option value="SOIL_CONDITION">Soil Nutrient Adjustment</option>
                                <option value="FARMER_PREFERENCE">Smallholder Preference</option>
                                <option value="SAFETY_CONCERN">Safety / Environmental Precaution</option>
                                <option value="OTHER">Other Field Observation</option>
                              </select>
                            </div>
                          )}

                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="review-comment">
                              {reviewStatus === 'NEEDS_REVISION'
                                ? (t('review.revisionInstructions') || 'Revision Instructions')
                                : (t('review.commentLabel') || 'Agronomic Commentary & Notes')}
                            </label>
                            <textarea
                              id="review-comment"
                              rows={4}
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              placeholder={
                                reviewStatus === 'NEEDS_REVISION'
                                  ? (t('review.commentPlaceholder') || 'Specify required adjustments for the farmer...')
                                  : 'Optional observations or guidance for the farmer...'
                              }
                              required={reviewStatus === 'NEEDS_REVISION'}
                              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
                            />
                          </div>

                          <Button
                            type="submit"
                            disabled={submittingReview}
                            className={cn(
                              'w-full text-white font-semibold',
                              reviewStatus === 'APPROVED' ? 'bg-blue-600 hover:bg-blue-500 glow-blue-sm' : 'bg-rose-600 hover:bg-rose-700'
                            )}
                          >
                            {submittingReview ? (
                              <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                {reviewStatus === 'APPROVED' ? 'Approving...' : 'Submitting...'}
                              </>
                            ) : reviewStatus === 'APPROVED' ? (
                              <>
                                <CheckCircle2 className="mr-2 size-4" />
                                {t('review.approveButton') || 'Approve Recommendation'}
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 size-4" />
                                {t('review.requestRevisionButton') || 'Request Revision'}
                              </>
                            )}
                          </Button>
                        </form>
                      )
                    ) : (
                      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-center space-y-3">
                        <Info className="size-8 text-blue-600 mx-auto" />
                        <h5 className="font-semibold text-sm text-foreground">
                          Advisory Verification
                        </h5>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t('review.farmerNotice')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Review Timeline (Cols 2-3) */}
              <div className={cn(isOfficer || currentUser?.role === 'admin' ? 'md:col-span-2' : 'md:col-span-3')}>
                <Card className="shadow-sm h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="size-5 text-primary" />
                        <CardTitle className="text-lg">{t('review.timeline')}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {reviews.length} Recorded Review{reviews.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <CardDescription>
                      {isOfficer
                        ? 'Chronological log of certified expert reviews'
                        : 'Official feedback and status updates from the Agricultural Extension Service'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reviews.length === 0 ? (
                      <div className="text-center py-10 border border-dashed rounded-xl border-border">
                        <UserCheck className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">
                          {isOfficer
                            ? 'No expert reviews have been recorded yet.'
                            : 'This recommendation is currently being evaluated by an Extension Officer.'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isOfficer
                            ? 'Submit a review using the form on the left.'
                            : 'You will receive an update once the review is completed.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reviews.map((rev, index) => (
                          <div
                            key={rev.id || index}
                            className="relative pl-6 pb-4 border-l-2 border-primary/20 last:border-l-transparent last:pb-0"
                          >
                            <div className="absolute -left-1.5 top-0.5 size-3 rounded-full bg-primary ring-4 ring-background" />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">
                                  {rev.reviewer_name
                                    ? (isOfficer ? rev.reviewer_name : `Extension Officer (${rev.reviewer_name})`)
                                    : 'Extension Officer'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {(isOfficer || currentUser?.role === 'admin') && rev.override_reason && (
                                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                    Reason: {rev.override_reason.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                                {getStatusBadge(rev.status)}
                                <span className="text-xs text-muted-foreground">
                                  {new Date(rev.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            {rev.comment && (
                              <p className="text-sm text-foreground/90 mt-2 bg-muted/30 p-3 rounded-xl border border-border/50 leading-relaxed">
                                {rev.comment}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Advisory Lifecycle Log (Internal Governance / Audit - Officer & Admin Only) */}
            {(isOfficer || currentUser?.role === 'admin') && (
              <Card className="shadow-sm border-border" role="region" aria-label="Advisory Lifecycle Log">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-5 text-primary" />
                      <CardTitle className="text-lg">{t('audit.title') || 'Advisory Lifecycle Log'}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {detail.audit_trail?.length ?? 0} Recorded Event{(detail.audit_trail?.length ?? 0) !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <CardDescription>{t('audit.subtitle') || 'Chronological record of recommendation events'}</CardDescription>
                </CardHeader>
                <CardContent>
                  {(!detail.audit_trail || detail.audit_trail.length === 0) ? (
                    <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-xl border-border">
                      No audit events recorded for this recommendation.
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-4 border-l-2 border-primary/20">
                      {detail.audit_trail.map((evt, idx) => (
                        <div key={evt.id || idx} className="relative group">
                          <div className="absolute -left-[31px] top-1.5 size-3 rounded-full bg-primary ring-4 ring-background" />
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs sm:text-sm text-foreground">
                                {evt.action}
                              </span>
                              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0 px-1.5">
                                {evt.user_role || 'system'}
                              </Badge>
                              {evt.user_name && (
                                <span className="text-xs text-muted-foreground">by {evt.user_name}</span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3" />
                              {new Date(evt.created_at).toLocaleDateString()} at{' '}
                              {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {evt.details && (
                            <p className="mt-1 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40 font-mono">
                              {evt.details}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
