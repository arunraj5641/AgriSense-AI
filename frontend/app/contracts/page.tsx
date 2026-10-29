'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  Handshake,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Building2,
  Loader2,
  Tractor,
  DollarSign
} from 'lucide-react';
import type { Farm, Contract, MatchingResult } from '@/types';

export default function FarmerContractsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [matchingResults, setMatchingResults] = useState<MatchingResult[]>([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);

  // Apply dialog states
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchingResult | null>(null);
  const [applyQuantity, setApplyQuantity] = useState('10');
  const [applying, setApplying] = useState(false);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [farmsData, contractsData] = await Promise.all([
        fetchApi('/farms'),
        fetchApi('/contracts')
      ]);
      setFarms(farmsData || []);
      setContracts(contractsData || []);
      if (farmsData && farmsData.length > 0) {
        setSelectedFarmId(farmsData[0].id);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadInitialData);
  }, [loadInitialData]);

  // Fetch matches when selectedFarmId changes
  useEffect(() => {
    if (!selectedFarmId) return;
    setMatchingLoading(true);
    fetchApi(`/contracts/matching/${selectedFarmId}`)
      .then((data: MatchingResult[]) => setMatchingResults(data || []))
      .catch(() => setMatchingResults([]))
      .finally(() => setMatchingLoading(false));
  }, [selectedFarmId]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || !selectedFarmId) return;

    setApplying(true);
    try {
      const createdContract = await fetchApi('/contracts/apply', {
        method: 'POST',
        body: JSON.stringify({
          procurement_id: selectedMatch.procurement_id,
          farm_id: selectedFarmId,
          agreed_quantity: parseFloat(applyQuantity) || 10,
          agreed_price: selectedMatch.offered_price
        })
      });
      setContracts((prev) => [createdContract, ...prev]);
      setApplyDialogOpen(false);
      toast.success(`Application submitted to ${selectedMatch.company_name}!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit contract application');
    } finally {
      setApplying(false);
    }
  };

  const handleMarkHarvestReady = async (contractId: string) => {
    try {
      const updated: Contract = await fetchApi(`/contracts/${contractId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'HARVEST_READY' })
      });
      setContracts((prev) => prev.map((c) => (c.id === contractId ? updated : c)));
      toast.success('Notified company that crop is harvest ready for inspection!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update contract');
    }
  };

  return (
    <AppShell
      title="Contract Farming & Sourcing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Contracts & Procurement' }
      ]}
    >
      <div className="space-y-8 pb-12">
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Contracts & Sourcing' }
          ]}
          title={t('contract.title')}
          description={t('contract.subtitle')}
        />

        <Tabs defaultValue="opportunities" className="w-full">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="opportunities">
              Procurement Matches
            </TabsTrigger>
            <TabsTrigger value="my-contracts">
              My Contracts ({contracts.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: MATCHING OPPORTUNITIES */}
          <TabsContent value="opportunities" className="space-y-6 mt-6">
            {/* Farm Selector Toolbar */}
            {farms.length > 0 && (
              <div className="flex items-center gap-3">
                <label htmlFor="contract-farm-select" className="text-sm font-medium text-muted-foreground shrink-0">Farm:</label>
                <select
                  id="contract-farm-select"
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm font-medium transition-base focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.farm_size} ha)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {matchingLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-xl" />
                ))}
              </div>
            ) : matchingResults.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="p-10 text-center">
                  <Handshake className="size-8 mx-auto text-muted-foreground/30 mb-3" />
                  <h3 className="text-sm font-semibold text-foreground">No compatible procurement orders</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Ensure your crop and soil report are updated to match with available orders.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {matchingResults.map((m) => {
                  const scorePct = Math.round(m.compatibility_score * 100);
                  const isHighMatch = scorePct >= 80;

                  return (
                    <Card key={m.procurement_id} className="border border-border/60 flex flex-col justify-between">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs text-muted-foreground">{m.company_name}</span>
                            <CardTitle className="text-base mt-0.5 capitalize">
                              {m.crop} Procurement
                            </CardTitle>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {scorePct}% match
                          </span>
                        </div>
                        <CardDescription className="text-xs mt-1">
                          ${m.offered_price}/T · {m.required_quantity} T required
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4 pt-0">
                        {/* Financial Projection */}
                        <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-lg text-center text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Est. Revenue</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">${m.estimated_revenue.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Est. Farm Cost</span>
                            <span className="font-medium text-foreground">${m.estimated_cost.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Projected Profit</span>
                            <span className="font-bold text-primary">${m.estimated_profit.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Match Explanation */}
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {m.match_explanation}
                        </p>

                        {/* Constraints breakdown */}
                        <div className="space-y-1.5 text-xs">
                          <p className="font-medium text-muted-foreground text-[11px]">Quality Evaluation Parameters:</p>
                          <div className="space-y-1">
                            {m.matched_constraints.map((c, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="size-3.5 shrink-0" />
                                <span className="truncate">{c.name}: {c.description}</span>
                              </div>
                            ))}
                            {m.failed_constraints.map((c, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                                <AlertCircle className="size-3.5 shrink-0" />
                                <span className="truncate">{c.name}: {c.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2">
                          <Button
                            className="w-full gap-2"
                            onClick={() => {
                              setSelectedMatch(m);
                              setApplyQuantity(String(Math.min(m.required_quantity, 15)));
                              setApplyDialogOpen(true);
                            }}
                          >
                            <Handshake className="size-4" />
                            Apply for Contract Farming
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: MY CONTRACTS */}
          <TabsContent value="my-contracts" className="space-y-6 mt-6">
            {contracts.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="p-10 text-center">
                  <Handshake className="size-8 mx-auto text-muted-foreground/30 mb-3" />
                  <h3 className="text-sm font-semibold text-foreground">No contracts yet</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Apply for procurement matches to create supply agreements.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {contracts.map((c) => (
                  <Card key={c.id} className="border border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs capitalize font-semibold">
                          {c.crop}
                        </Badge>
                        <Badge
                          variant={
                            c.status === 'ACCEPTED' || c.status === 'COMPLETED'
                              ? 'default'
                              : c.status === 'HARVEST_READY'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-[11px]"
                        >
                          {c.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <CardTitle className="text-base mt-2">
                        {c.company_name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Farm: {c.farm_name} • Agreed: {c.agreed_quantity} Tonnes @ ${c.agreed_price.toLocaleString()}/T
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0 text-xs">
                      <div className="flex justify-between bg-muted/30 p-2.5 rounded-lg">
                        <span className="text-muted-foreground">Total Contract Value:</span>
                        <span className="font-bold text-green-600">
                          ${(c.agreed_quantity * c.agreed_price).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        {c.terms_and_conditions || 'Standard contract farming agreement per SAU agricultural guidelines.'}
                      </p>

                      {c.status === 'IN_PROGRESS' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs gap-1.5"
                          onClick={() => handleMarkHarvestReady(c.id)}
                        >
                          <Sparkles className="size-3.5 text-primary" />
                          Mark Harvest Ready for Inspection
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Apply Dialog */}
        <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Handshake className="size-5 text-primary" />
                Apply for Contract Farming
              </DialogTitle>
              <DialogDescription>
                Submit your proposed delivery volume to {selectedMatch?.company_name}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleApply} className="space-y-4 py-2">
              <div className="space-y-1.5 text-xs">
                <p><span className="text-muted-foreground">Crop:</span> <span className="font-semibold capitalize">{selectedMatch?.crop}</span></p>
                <p><span className="text-muted-foreground">Company Price:</span> <span className="font-semibold text-green-600">${selectedMatch?.offered_price} / Tonne</span></p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="applyQty">Proposed Supply Volume (Tonnes)</Label>
                <Input
                  id="applyQty"
                  type="number"
                  step="0.5"
                  value={applyQuantity}
                  onChange={(e) => setApplyQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="p-3 bg-muted/40 rounded-lg text-xs flex justify-between font-medium">
                <span>Estimated Contract Value:</span>
                <span className="font-bold text-green-600">
                  ${((parseFloat(applyQuantity) || 0) * (selectedMatch?.offered_price || 0)).toLocaleString()}
                </span>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setApplyDialogOpen(false)} disabled={applying}>
                  Cancel
                </Button>
                <Button type="submit" disabled={applying}>
                  {applying ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Contract Application'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
