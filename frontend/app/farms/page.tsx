'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FarmCard } from '@/components/dashboard/farm-card';
import { AddFarmDialog } from '@/components/dashboard/add-farm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tractor, Plus, Search, Filter } from 'lucide-react';
import type { Farm } from '@/types';

export default function MyFarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIrrigation, setSelectedIrrigation] = useState<string>('all');
  const router = useRouter();

  const loadFarms = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const data = await fetchApi('/farms');
      setFarms(data);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadFarms);
  }, [loadFarms]);

  // Extract unique irrigation types
  const irrigationTypes = Array.from(
    new Set(
      farms
        .map((f) => f.irrigation_type)
        .filter((type): type is string => Boolean(type && type.trim()))
    )
  );

  const filteredFarms = farms.filter((farm) => {
    const matchesSearch =
      farm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      farm.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIrrigation =
      selectedIrrigation === 'all' ||
      (farm.irrigation_type &&
        farm.irrigation_type.toLowerCase() === selectedIrrigation.toLowerCase());
    return matchesSearch && matchesIrrigation;
  });

  return (
    <AppShell
      title="My Farms"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'My Farms' },
      ]}
    >
      <div className="space-y-6 pb-12">
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'My Farms' },
          ]}
          title="My Farms"
          badge={
            !loading ? (
              <Badge variant="secondary" className="font-semibold">
                {farms.length} {farms.length === 1 ? 'Farm' : 'Farms'}
              </Badge>
            ) : null
          }
          description="View, search, and manage all your registered farms."
          actions={
            <Button onClick={() => setIsModalOpen(true)} className="shrink-0 gap-2">
              <Plus className="size-4" />
              Add Farm
            </Button>
          }
        />

        {/* Search & Filter Bar */}
        {!loading && farms.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search farms by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {irrigationTypes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Filter className="mr-1 size-3.5 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setSelectedIrrigation('all')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-base ${
                    selectedIrrigation === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({farms.length})
                </button>
                {irrigationTypes.map((type) => {
                  const count = farms.filter(
                    (f) => f.irrigation_type?.toLowerCase() === type.toLowerCase()
                  ).length;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedIrrigation(type)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-base ${
                        selectedIrrigation.toLowerCase() === type.toLowerCase()
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {type} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Farms Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : farms.length === 0 ? (
          <EmptyState
            icon={Tractor}
            title="No farms registered yet"
            description="Create your first farm to start tracking crops, equipment, budget, and soil analysis."
            action={
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 size-4" />
                Add Your First Farm
              </Button>
            }
          />
        ) : filteredFarms.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching farms"
            description={`No farms matched your query "${searchQuery}". Clear your search or filters to see all farms.`}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedIrrigation('all');
                }}
              >
                Clear Filters
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFarms.map((farm) => (
              <FarmCard key={farm.id} farm={farm} />
            ))}
          </div>
        )}

        {/* Add Farm Dialog */}
        <AddFarmDialog
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSuccess={loadFarms}
        />
      </div>
    </AppShell>
  );
}
