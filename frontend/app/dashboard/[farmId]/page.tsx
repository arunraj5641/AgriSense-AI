'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FarmOverview } from '@/components/farm/farm-overview';
import { CropsSection } from '@/components/farm/crops-section';
import { EquipmentSection } from '@/components/farm/equipment-section';
import { BudgetSection } from '@/components/farm/budget-section';
import { SoilSection } from '@/components/farm/soil-section';
import { RecommendationSection } from '@/components/farm/recommendation-section';
import {
  ArrowLeft,
  LayoutDashboard,
  Sprout,
  Wrench,
  DollarSign,
  FlaskConical,
  BrainCircuit,
  MapPin,
} from 'lucide-react';
import type { Farm, Crop, Equipment, Budget, SoilReport, Recommendation } from '@/types';

export default function ManageFarm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const farmId = params.farmId as string;
  const router = useRouter();

  const [farm, setFarm] = useState<Farm | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [soilReport, setSoilReport] = useState<SoilReport | null>(null);
  const [loading, setLoading] = useState(true);

  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      void Promise.resolve().then(() => setActiveTab(tab));
    }
  }, [searchParams]);

  const loadData = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const farmData = await fetchApi(`/farms/${farmId}`);
      setFarm(farmData);

      const [recsData, cropsData, eqData, budgetData, soilData] = await Promise.all([
        fetchApi(`/recommendations/farms/${farmId}`).catch(() => []),
        fetchApi(`/resources/farms/${farmId}/crops`).catch(() => []),
        fetchApi(`/resources/farms/${farmId}/equipment`).catch(() => []),
        fetchApi(`/resources/farms/${farmId}/budget`).catch(() => null),
        fetchApi(`/resources/farms/${farmId}/soil-report`).catch(() => null),
      ]);

      setRecommendations(recsData);
      setCrops(cropsData);
      setEquipment(eqData);
      setBudget(budgetData);
      setSoilReport(soilData);
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [farmId, router]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  if (loading) {
    return (
      <AppShell
        title="Farm Management"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Farms', href: '/farms' },
          { label: 'Loading...' },
        ]}
      >
        <div className="space-y-6 animate-fade-in">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-10 w-full max-w-lg rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!farm) {
    return (
      <AppShell
        title="Farm Not Found"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Farms', href: '/farms' },
          { label: 'Not Found' },
        ]}
      >
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-semibold text-destructive">Farm not found</p>
          <p className="mt-1 text-sm text-muted-foreground">The farm you&apos;re looking for doesn&apos;t exist.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 size-4" />
            Back to Dashboard
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={farm.name}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'My Farms', href: '/farms' },
        { label: farm.name },
      ]}
    >
      <div className="space-y-8 pb-12">
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'My Farms', href: '/farms' },
            { label: farm.name },
          ]}
          title={farm.name}
          description={`${farm.location} · ${farm.farm_size} acres${farm.irrigation_type ? ` · ${farm.irrigation_type}` : ''}`}
          actions={
            <Link href="/farms" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              <ArrowLeft className="mr-1.5 size-3.5" />
              All Farms
            </Link>
          }
        />

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto h-auto p-1">
            <TabsTrigger value="overview" className="gap-1.5">
              <LayoutDashboard className="size-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="crops" className="gap-1.5">
              <Sprout className="size-3.5" />
              <span className="hidden sm:inline">Crops</span>
              {crops.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{crops.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="equipment" className="gap-1.5">
              <Wrench className="size-3.5" />
              <span className="hidden sm:inline">Equipment</span>
              {equipment.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{equipment.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="budget" className="gap-1.5">
              <DollarSign className="size-3.5" />
              <span className="hidden sm:inline">Budget</span>
            </TabsTrigger>
            <TabsTrigger value="soil" className="gap-1.5">
              <FlaskConical className="size-3.5" />
              <span className="hidden sm:inline">Soil</span>
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="gap-1.5">
              <BrainCircuit className="size-3.5" />
              <span className="hidden sm:inline">AI Recs</span>
              {recommendations.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{recommendations.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <FarmOverview
              farm={farm}
              crops={crops}
              equipment={equipment}
              budget={budget}
              soilReport={soilReport}
              latestRecommendation={recommendations.length > 0 ? recommendations[0] : null}
            />
          </TabsContent>

          <TabsContent value="crops">
            <CropsSection
              farmId={farmId}
              crops={crops}
              onCropAdded={(crop) => setCrops([...crops, crop])}
            />
          </TabsContent>

          <TabsContent value="equipment">
            <EquipmentSection
              farmId={farmId}
              equipment={equipment}
              onEquipmentAdded={(eq) => setEquipment([...equipment, eq])}
            />
          </TabsContent>

          <TabsContent value="budget">
            <BudgetSection
              farmId={farmId}
              budget={budget}
              onBudgetUpdated={(b) => setBudget(b)}
            />
          </TabsContent>

          <TabsContent value="soil">
            <SoilSection
              farmId={farmId}
              soilReport={soilReport}
              onSoilUpdated={(report) => setSoilReport(report)}
            />
          </TabsContent>

          <TabsContent value="recommendations">
            <RecommendationSection
              farmId={farmId}
              recommendations={recommendations}
              onRecommendationGenerated={(rec) => setRecommendations([rec, ...recommendations])}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
