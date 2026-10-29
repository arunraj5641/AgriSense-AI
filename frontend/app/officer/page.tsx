'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi, ApiError } from '@/lib/api';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import {
  BrainCircuit,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
  User,
  Tractor,
  Sprout,
  X,
} from 'lucide-react';
import type { OfficerQueueItem, OfficerStats, ReviewStatus, User as UserType } from '@/types';

export default function OfficerDashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [stats, setStats] = useState<OfficerStats | null>(null);
  const [items, setItems] = useState<OfficerQueueItem[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed' | 'all'>('pending');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [cropFilter, setCropFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Quick Review Modal State
  const [reviewingItem, setReviewingItem] = useState<OfficerQueueItem | null>(null);
  const [quickStatus, setQuickStatus] = useState<'APPROVED' | 'NEEDS_REVISION'>('APPROVED');
  const [quickReason, setQuickReason] = useState<string>('AGRONOMIC_JUDGMENT');
  const [quickComment, setQuickComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [successState, setSuccessState] = useState<'APPROVED' | 'NEEDS_REVISION' | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const user = await fetchApi('/auth/me');
      setCurrentUser(user);

      if (user.role !== 'extension_officer' && user.role !== 'admin') {
        toast.error('Access restricted to Agricultural Extension Officers.');
        router.push('/dashboard');
        return;
      }

      const [statsData, queueData] = await Promise.all([
        fetchApi('/recommendations/officer/stats').catch(() => null),
        fetchApi('/recommendations/officer/queue').catch(() => []),
      ]);

      setStats(statsData);
      setItems(queueData);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  // Unique crops in the queue for filter dropdown
  const availableCrops = useMemo(() => {
    const crops = new Set<string>();
    items.forEach((item) => {
      item.crops?.forEach((c) => crops.add(c.toLowerCase()));
    });
    return Array.from(crops);
  }, [items]);

  // Filtered recommendations
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Tab filter
      if (activeTab === 'pending') {
        // Pending tab must strictly only show items awaiting officer review
        // Exclude APPROVED, IMPLEMENTED, NEEDS_REVISION
        if (
          item.status === 'APPROVED' ||
          item.status === 'IMPLEMENTED' ||
          item.status === 'NEEDS_REVISION' ||
          item.review_status !== 'PENDING'
        ) {
          return false;
        }
      }
      if (activeTab === 'reviewed') {
        // Reviewed tab shows items that have been approved, completed, or had revisions requested
        if (
          item.status !== 'APPROVED' &&
          item.status !== 'NEEDS_REVISION' &&
          item.status !== 'IMPLEMENTED' &&
          item.review_status === 'PENDING'
        ) {
          return false;
        }
      }

      // Crop filter
      if (cropFilter !== 'all' && !item.crops?.some((c) => c.toLowerCase() === cropFilter.toLowerCase())) {
        return false;
      }

      // Review Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'PENDING') {
          if (
            item.status === 'APPROVED' ||
            item.status === 'IMPLEMENTED' ||
            item.status === 'NEEDS_REVISION' ||
            item.review_status !== 'PENDING'
          ) {
            return false;
          }
        } else if (item.status !== statusFilter && item.review_status !== statusFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.farmer_name.toLowerCase().includes(q) ||
          item.farmer_email.toLowerCase().includes(q) ||
          item.farm_name.toLowerCase().includes(q) ||
          item.recommendation.toLowerCase().includes(q) ||
          item.crops?.some((c) => c.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [items, activeTab, cropFilter, statusFilter, searchQuery]);

  const openReviewModal = async (item: OfficerQueueItem) => {
    // 1. Guard against locally already completed or approved items
    if (item.status === 'IMPLEMENTED' || item.review_status === 'IMPLEMENTED') {
      toast.info('This recommendation has already been completed.');
      return;
    }
    if (item.status === 'APPROVED' || item.review_status === 'APPROVED') {
      toast.info('This recommendation has already been reviewed.');
      return;
    }

    // 2. Fetch fresh recommendation details from backend before opening to prevent stale reviews across tabs
    try {
      const freshRec = await fetchApi(`/recommendations/${item.id}`);
      const latestStatus = freshRec?.recommendation?.status || freshRec?.status;
      if (latestStatus === 'IMPLEMENTED') {
        toast.info('This recommendation has already been completed.');
        await loadData();
        return;
      }
      if (latestStatus === 'APPROVED') {
        toast.info('This recommendation has already been reviewed.');
        await loadData();
        return;
      }
    } catch {
      // Proceed if network error but keep client guards
    }

    setReviewingItem(item);
    setQuickStatus('APPROVED');
    setQuickReason('AGRONOMIC_JUDGMENT');
    setQuickComment('');
    setSuccessState(null);
    setReviewError(null);
  };

  const handleQuickReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingItem) return;

    if (quickStatus === 'NEEDS_REVISION') {
      if (!quickReason) {
        setReviewError(t('review.revisionReason') || 'Please select a reason for revision.');
        return;
      }
      if (!quickComment.trim()) {
        setReviewError(t('review.revisionInstructions') || 'Please provide revision instructions.');
        return;
      }
    }

    setSubmittingReview(true);
    setReviewError(null);

    try {
      await fetchApi(`/recommendations/${reviewingItem.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status: quickStatus,
          comment: quickComment.trim(),
          override_reason: quickStatus === 'NEEDS_REVISION' ? quickReason : undefined,
        }),
      });

      // API success: transition to persistent confirmation state
      setSuccessState(quickStatus);

      // Immediately update local recommendation state in memory so it reflects the new state
      setItems((prev) =>
        prev.map((it) =>
          it.id === reviewingItem.id
            ? {
                ...it,
                review_status: quickStatus,
                status: quickStatus === 'APPROVED' ? 'APPROVED' : 'NEEDS_REVISION',
              }
            : it
        )
      );

      // Eagerly update stats
      setStats((prev) => {
        if (!prev) return prev;
        const wasPending = reviewingItem.status !== 'APPROVED' && reviewingItem.status !== 'NEEDS_REVISION';
        return {
          ...prev,
          pending_reviews: wasPending ? Math.max(0, prev.pending_reviews - 1) : prev.pending_reviews,
          approved: quickStatus === 'APPROVED' ? prev.approved + 1 : prev.approved,
          needs_revision: quickStatus === 'NEEDS_REVISION' ? prev.needs_revision + 1 : prev.needs_revision,
        };
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      if (
        errMsg.toLowerCase().includes('already been implemented') ||
        errMsg.toLowerCase().includes('already been completed')
      ) {
        toast.info('This recommendation has already been completed.');
        setReviewingItem(null);
        setSuccessState(null);
        await loadData();
        return;
      }
      if (errMsg.toLowerCase().includes('already been reviewed') || errMsg.toLowerCase().includes('already approved')) {
        toast.info('This recommendation has already been reviewed.');
        setReviewingItem(null);
        setSuccessState(null);
        await loadData();
        return;
      }
      const defaultErr = quickStatus === 'APPROVED'
        ? (t('review.approveError') || 'Could not approve this recommendation. Please try again.')
        : (t('review.revisionError') || 'Could not submit revision request. Please try again.');
      const msg = errMsg || defaultErr;
      setReviewError(msg);
      toast.error(msg);
      // Keep modal open, preserve officer's inputs
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReviewDone = async () => {
    if (!reviewingItem || !successState) return;

    // Close modal and reset
    setReviewingItem(null);
    setSuccessState(null);
    setQuickComment('');
    setReviewError(null);

    // Revalidate from backend: reload stats and fresh queue
    await loadData();
  };

  return (
    <AppShell
      title={t('officer.title')}
      breadcrumbs={[
        { label: t('nav.dashboard'), href: '/officer' },
        { label: t('officer.queueTab') },
      ]}
    >
      <div className="space-y-8 pb-12">
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/officer' },
            { label: 'Review Queue' },
          ]}
          title={t('officer.title') || 'Agricultural Extension Officer Dashboard'}
          description="Review and certify advisory recommendations requiring expert attention."
        />

        {/* Metric Summary Cards */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Pending Reviews */}
            <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-blue-500/35 transition-base relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">
                  {t('officer.pendingReviews')}
                </span>
                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  <Clock className="size-3.5" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {stats?.pending_reviews ?? 0}
              </p>
              <div className="mt-2.5 h-0.5 w-8 rounded-full bg-blue-500/70" />
            </div>

            {/* 2. Approved */}
            <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-emerald-500/35 transition-base relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">
                  {t('officer.approvedRecs')}
                </span>
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {stats?.approved ?? 0}
              </p>
              <div className="mt-2.5 h-0.5 w-8 rounded-full bg-emerald-500/70" />
            </div>

            {/* 3. Needs Revision */}
            <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-amber-500/35 transition-base relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">
                  {t('officer.needsRevisionRecs')}
                </span>
                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  <AlertTriangle className="size-3.5" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {stats?.needs_revision ?? 0}
              </p>
              <div className="mt-2.5 h-0.5 w-8 rounded-full bg-amber-500/70" />
            </div>

            {/* 4. Total Recommendations */}
            <div className="rounded-xl border border-border/80 bg-card p-4.5 shadow-sm hover:border-slate-600 transition-base relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">
                  {t('officer.totalRecs')}
                </span>
                <div className="flex size-7 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                  <Layers className="size-3.5" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {stats?.total_recommendations ?? 0}
              </p>
              <div className="mt-2.5 h-0.5 w-8 rounded-full bg-slate-700" />
            </div>
          </div>
        )}

        {/* Filter and Tab Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            {/* Tabs (Segmented Control) */}
            <div className="flex items-center p-1 bg-[#0A0F1D] rounded-xl border border-border/80 gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-base flex items-center gap-1.5',
                  activeTab === 'pending'
                    ? 'bg-[#111A2B] text-foreground border border-blue-500/30 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[#111A2B]/40'
                )}
              >
                <span>{t('officer.pendingReviews')}</span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  activeTab === 'pending' ? 'bg-blue-500/20 text-blue-400' : 'bg-muted text-muted-foreground'
                )}>
                  {stats?.pending_reviews ?? 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reviewed')}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-base flex items-center gap-1.5',
                  activeTab === 'reviewed'
                    ? 'bg-[#111A2B] text-foreground border border-blue-500/30 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[#111A2B]/40'
                )}
              >
                <span>Recently Reviewed</span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  activeTab === 'reviewed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'
                )}>
                  {(stats?.approved ?? 0) + (stats?.needs_revision ?? 0)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-base flex items-center gap-1.5',
                  activeTab === 'all'
                    ? 'bg-[#111A2B] text-foreground border border-blue-500/30 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[#111A2B]/40'
                )}
              >
                <span>{t('common.all')}</span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  activeTab === 'all' ? 'bg-slate-700 text-slate-300' : 'bg-muted text-muted-foreground'
                )}>
                  {stats?.total_recommendations ?? 0}
                </span>
              </button>
            </div>

            <p className="text-xs text-muted-foreground font-medium">
              Showing {filteredItems.length} of {items.length} recommendations
            </p>
          </div>

          {/* Search and Filters Bar (Unified Control Group) */}
          <div className="grid gap-3 sm:grid-cols-12 items-center">
            <div className="relative sm:col-span-6 lg:col-span-7">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                placeholder={t('officer.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9.5 h-10 bg-[#0D1321] border-border/80 rounded-xl text-xs placeholder:text-muted-foreground/60 focus-visible:bg-[#111A2B] focus-visible:border-blue-500/50 focus-visible:ring-1 focus-visible:ring-blue-500/30"
              />
            </div>

            {/* Crop Filter */}
            <div className="sm:col-span-3 lg:col-span-3">
              <select
                aria-label={t('officer.filterCrop')}
                value={cropFilter}
                onChange={(e) => setCropFilter(e.target.value)}
                className="h-10 w-full rounded-xl border border-border/80 bg-[#0D1321] px-3.5 py-2 text-xs text-foreground transition-base focus-visible:bg-[#111A2B] focus-visible:border-blue-500/50 focus-visible:ring-1 focus-visible:ring-blue-500/30 outline-none cursor-pointer"
              >
                <option value="all">{t('common.all')} Crops</option>
                {availableCrops.map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Review Status Filter */}
            <div className="sm:col-span-3 lg:col-span-2">
              <select
                aria-label={t('officer.filterStatus')}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 w-full rounded-xl border border-border/80 bg-[#0D1321] px-3.5 py-2 text-xs text-foreground transition-base focus-visible:bg-[#111A2B] focus-visible:border-blue-500/50 focus-visible:ring-1 focus-visible:ring-blue-500/30 outline-none cursor-pointer"
              >
                <option value="all">{t('common.all')} Statuses</option>
                <option value="PENDING">{t('common.pending')}</option>
                <option value="APPROVED">{t('common.approved')}</option>
                <option value="NEEDS_REVISION">{t('common.needsRevision')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recommendations Queue List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={BrainCircuit}
            title={activeTab === 'pending' ? 'No pending recommendations' : 'No recommendations match filters'}
            description="All smallholder recommendations have been reviewed or no records match your criteria."
            className="py-14"
          />
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm hover:border-blue-500/35 hover:shadow-md transition-base space-y-4',
                  item.review_status === 'APPROVED' && 'border-emerald-500/20',
                  item.review_status === 'NEEDS_REVISION' && 'border-amber-500/20'
                )}
              >
                {/* Item Top Header: Farm Name + Farmer & Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                      <Tractor className="size-3.5" />
                    </div>
                    <span className="font-semibold text-foreground text-sm sm:text-base tracking-tight">
                      {item.farm_name}
                    </span>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="size-3 text-muted-foreground/70" />
                      {item.farmer_name}
                      <span className="text-muted-foreground/50">({item.farmer_email})</span>
                    </span>
                  </div>

                  {/* Review Status Badge */}
                  <div>
                    {item.status === 'IMPLEMENTED' || item.review_status === 'IMPLEMENTED' ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 font-semibold gap-1.5">
                        <CheckCircle2 className="size-3 text-emerald-400" />
                        Completed
                      </Badge>
                    ) : item.status === 'APPROVED' || item.review_status === 'APPROVED' ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 font-semibold gap-1.5">
                        <CheckCircle2 className="size-3 text-emerald-400" />
                        Approved
                      </Badge>
                    ) : item.status === 'NEEDS_REVISION' || item.review_status === 'NEEDS_REVISION' ? (
                      <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-0.5 font-semibold gap-1.5">
                        <AlertTriangle className="size-3 text-amber-400" />
                        Needs Revision
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-0.5 font-semibold gap-1.5">
                        <Clock className="size-3 text-blue-400" />
                        Pending Review
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Main: Recommendation Title & Secondary Explanation */}
                <div className="rounded-xl bg-[#111A2B]/60 p-4 border border-border/60 space-y-1.5">
                  <h4 className="font-semibold text-foreground text-sm sm:text-base leading-snug">
                    {item.recommendation}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.explanation}
                  </p>
                </div>

                {/* Metadata & Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-4 flex-wrap text-muted-foreground/80">
                    {item.crops && item.crops.length > 0 && (
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <Sprout className="size-3.5 text-blue-400" />
                        {item.crops.map((c) => c.toUpperCase()).join(', ')}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="size-3.5 text-muted-foreground/70" />
                      {(item.confidence_score * 100).toFixed(0)}% Confidence
                    </span>
                    {item.estimated_cost !== null && (
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="size-3.5 text-muted-foreground/70" />
                        Est. Cost: ${item.estimated_cost}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-muted-foreground/60">
                      <Calendar className="size-3.5" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions: Secondary Quick Review + Primary Electric Blue View Details */}
                  <div className="flex items-center gap-2">
                    {item.status === 'IMPLEMENTED' || item.review_status === 'IMPLEMENTED' ? (
                      <Badge
                        variant="secondary"
                        className="text-xs font-semibold h-8 px-3 bg-muted text-muted-foreground border border-border"
                      >
                        <CheckCircle2 className="mr-1.5 size-3.5 text-emerald-400" />
                        Completed
                      </Badge>
                    ) : item.status === 'APPROVED' || item.review_status === 'APPROVED' ? (
                      <Badge
                        className="text-xs font-semibold h-8 px-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      >
                        <CheckCircle2 className="mr-1.5 size-3.5" />
                        Approved
                      </Badge>
                    ) : item.status === 'NEEDS_REVISION' || item.review_status === 'NEEDS_REVISION' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReviewModal(item)}
                        className="text-xs font-semibold h-8 bg-[#111A2B] text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                      >
                        <AlertTriangle className="mr-1.5 size-3.5" />
                        Re-Review
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReviewModal(item)}
                        className="text-xs font-semibold h-8 bg-[#111A2B] border-border text-foreground hover:bg-[#1A263D] hover:border-border/80"
                      >
                        <Clock className="mr-1.5 size-3.5 text-blue-400" />
                        {t('officer.quickReview')}
                      </Button>
                    )}

                    <Link
                      href={`/recommendations/${item.id}`}
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-8 px-3 gap-1.5 shadow-sm glow-blue-sm transition-base"
                    >
                      {t('common.viewDetails')}
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Review Modal Dialog */}
        {reviewingItem && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-review-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
          >
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-5 animate-slide-up">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h3 id="quick-review-title" className="text-lg font-bold text-foreground">
                    {successState
                      ? (successState === 'APPROVED'
                          ? (t('review.approvedTitle') || 'Recommendation Approved')
                          : (t('review.revisionTitle') || 'Revision Requested'))
                      : (t('review.submitForm') || 'Submit Expert Officer Review')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Farm: {reviewingItem.farm_name} • Farmer: {reviewingItem.farmer_name}
                  </p>
                </div>
                {!successState && (
                  <button
                    type="button"
                    onClick={() => setReviewingItem(null)}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={t('common.close')}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* SUCCESS CONFIRMATION STATE */}
              {successState ? (
                <div className="py-6 text-center space-y-4 animate-fade-in">
                  <div
                    className={cn(
                      'mx-auto flex size-14 items-center justify-center rounded-full',
                      successState === 'APPROVED'
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : 'bg-amber-500/15 text-amber-600'
                    )}
                  >
                    {successState === 'APPROVED' ? (
                      <CheckCircle2 className="size-8" />
                    ) : (
                      <AlertTriangle className="size-8" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-foreground">
                      {successState === 'APPROVED'
                        ? (t('review.approvedTitle') || 'Recommendation Approved')
                        : (t('review.revisionTitle') || 'Revision Requested')}
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      {successState === 'APPROVED'
                        ? (t('review.approvedDesc') ||
                          'This recommendation has been officially approved. The farmer can now proceed with the recommendation.')
                        : (t('review.revisionDesc') ||
                          'The recommendation has been sent back for changes.')}
                    </p>
                  </div>

                  <div className="pt-3">
                    <Button
                      onClick={handleReviewDone}
                      className={cn(
                        'min-w-28 font-semibold text-xs shadow-sm',
                        successState === 'APPROVED'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : ''
                      )}
                    >
                      {t('review.doneButton') || 'Done'}
                    </Button>
                  </div>
                </div>
              ) : (
                /* REVIEW SUBMISSION FORM */
                <>
                  {/* Recommendation Preview */}
                  <div className="rounded-lg bg-muted/40 p-3 border border-border/60 text-xs space-y-1">
                    <span className="font-semibold text-foreground">Advisory:</span>
                    <p className="text-muted-foreground">{reviewingItem.recommendation}</p>
                  </div>

                  {reviewError && (
                    <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-600 flex items-center gap-2">
                      <AlertTriangle className="size-4 shrink-0" />
                      <span>{reviewError}</span>
                    </div>
                  )}

                  <form onSubmit={handleQuickReviewSubmit} className="space-y-4">
                    {/* Status Toggle */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">
                        {t('review.actionLabel')}
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setQuickStatus('APPROVED');
                            setReviewError(null);
                          }}
                          className={cn(
                            'flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-base',
                            quickStatus === 'APPROVED'
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          )}
                        >
                          <CheckCircle2 className="size-3.5" />
                          {t('common.approved')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickStatus('NEEDS_REVISION');
                            setReviewError(null);
                          }}
                          className={cn(
                            'flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-base',
                            quickStatus === 'NEEDS_REVISION'
                              ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          )}
                        >
                          <AlertTriangle className="size-3.5" />
                          {t('common.needsRevision')}
                        </button>
                      </div>
                    </div>

                    {/* Conditional Structured Revision Reason for NEEDS_REVISION */}
                    {quickStatus === 'NEEDS_REVISION' && (
                      <div className="space-y-1.5 animate-fade-in">
                        <label
                          htmlFor="quick-revision-reason"
                          className="text-xs font-medium text-foreground"
                        >
                          {t('review.revisionReason') || 'Reason for Revision'}
                        </label>
                        <select
                          id="quick-revision-reason"
                          value={quickReason}
                          onChange={(e) => setQuickReason(e.target.value)}
                          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs transition-base focus:outline-none focus:ring-2 focus:ring-ring"
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

                    {/* Comment Textarea */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="quick-comment"
                        className="text-xs font-medium text-foreground flex items-center justify-between"
                      >
                        <span>
                          {quickStatus === 'NEEDS_REVISION'
                            ? (t('review.revisionInstructions') || 'Revision Instructions')
                            : (t('review.commentLabel') || 'Agronomic Commentary & Notes')}
                        </span>
                        {quickStatus === 'APPROVED' && (
                          <span className="text-[11px] text-muted-foreground font-normal">
                            (Optional)
                          </span>
                        )}
                      </label>
                      <textarea
                        id="quick-comment"
                        rows={3}
                        value={quickComment}
                        onChange={(e) => setQuickComment(e.target.value)}
                        placeholder={
                          quickStatus === 'NEEDS_REVISION'
                            ? (t('review.commentPlaceholder') ||
                              'Specify necessary adjustments or recommendations for the farmer...')
                            : 'Optional observations or guidance for the farmer...'
                        }
                        required={quickStatus === 'NEEDS_REVISION'}
                        className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 transition-base focus-visible:ring-2 focus-visible:ring-ring outline-none leading-relaxed"
                      />
                    </div>

                    {/* Modal Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setReviewingItem(null)}
                        disabled={submittingReview}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={submittingReview}
                        className={cn(
                          'gap-1.5 font-semibold text-xs text-white',
                          quickStatus === 'APPROVED'
                            ? 'bg-blue-600 hover:bg-blue-500 glow-blue-sm'
                            : 'bg-rose-600 hover:bg-rose-700'
                        )}
                      >
                        {submittingReview ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            {quickStatus === 'APPROVED' ? 'Approving...' : 'Submitting...'}
                          </>
                        ) : quickStatus === 'APPROVED' ? (
                          <>
                            <CheckCircle2 className="size-3.5" />
                            {t('review.approveButton') || 'Approve Recommendation'}
                          </>
                        ) : (
                          <>
                            <Send className="size-3.5" />
                            {t('review.requestRevisionButton') || 'Request Revision'}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
