'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { PlusCircle, ShoppingBag, Loader2, Sparkles, Filter } from 'lucide-react';
import type { Company, ProcurementRequirement } from '@/types';

export default function CompanyProcurementsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [procurements, setProcurements] = useState<ProcurementRequirement[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [crop, setCrop] = useState('rice');
  const [quantity, setQuantity] = useState('100');
  const [price, setPrice] = useState('320');
  const [grade, setGrade] = useState('Grade A');
  const [moisture, setMoisture] = useState('14.0');
  const [nitrogen, setNitrogen] = useState('18.0');
  const [phosphorus, setPhosphorus] = useState('25.0');
  const [potassium, setPotassium] = useState('30.0');
  const [organicMatter, setOrganicMatter] = useState('1.5');
  const [minFarmSize, setMinFarmSize] = useState('2.0');
  const [irrigation, setIrrigation] = useState('drip');
  const [harvestWindow, setHarvestWindow] = useState('October - November');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const compData = await fetchApi('/companies/me');
      setCompany(compData);
      if (compData?.id) {
        const procs = await fetchApi(`/companies/${compData.id}/procurements`);
        setProcurements(procs || []);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    setSubmitting(true);
    try {
      const created = await fetchApi(`/companies/${company.id}/procurements`, {
        method: 'POST',
        body: JSON.stringify({
          crop: crop.toLowerCase(),
          required_quantity: parseFloat(quantity) || 100,
          offered_price: parseFloat(price) || 300,
          minimum_quality_grade: grade,
          moisture_percentage: parseFloat(moisture) || null,
          nitrogen_requirement: parseFloat(nitrogen) || null,
          phosphorus_requirement: parseFloat(phosphorus) || null,
          potassium_requirement: parseFloat(potassium) || null,
          organic_matter_requirement: parseFloat(organicMatter) || null,
          minimum_farm_size: parseFloat(minFarmSize) || 1.0,
          preferred_irrigation: irrigation,
          harvest_window: harvestWindow,
          status: 'OPEN'
        })
      });
      setProcurements((prev) => [created, ...prev]);
      setDialogOpen(false);
      toast.success('Procurement order published successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish procurement order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Procurement Requirements"
      breadcrumbs={[
        { label: 'Portal', href: '/company' },
        { label: 'Procurement Requirements' }
      ]}
    >
      <div className="space-y-6 pb-12">
        <PageHeader
          breadcrumbs={[
            { label: 'Portal', href: '/company' },
            { label: 'Procurement Requirements' }
          ]}
          title="Procurement Orders & Standards"
          description="Define agricultural quality standards, target volumes, and pricing for contracted smallholders."
          actions={
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <PlusCircle className="size-4" />
              {t('company.newProcurement')}
            </Button>
          }
        />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-60 rounded-xl" />
            ))}
          </div>
        ) : procurements.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingBag className="size-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-base font-semibold text-foreground">No Procurement Orders Published</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Publish quality grades and sourcing quotas to enable smallholders to match and apply for contract farming.
              </p>
              <Button onClick={() => setDialogOpen(true)} className="mt-4 gap-2">
                <PlusCircle className="size-4" />
                Publish First Order
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {procurements.map((p) => (
              <Card key={p.id} className="border border-border/80 shadow-xs hover:border-primary/50 transition-base">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="capitalize text-xs font-semibold px-2.5 py-0.5">
                      {p.crop}
                    </Badge>
                    <Badge variant={p.status === 'OPEN' ? 'default' : 'outline'} className="text-[11px]">
                      {p.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">
                    {p.required_quantity} Tonnes
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Offered Price: <span className="font-semibold text-green-600 dark:text-green-400">${p.offered_price} / Tonne</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quality Standard:</span>
                      <span className="font-medium text-foreground">{p.minimum_quality_grade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min. Farm Size:</span>
                      <span className="font-medium text-foreground">{p.minimum_farm_size || 1.0} ha</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Preferred Irrigation:</span>
                      <span className="font-medium text-foreground capitalize">{p.preferred_irrigation || 'Any'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Harvest Window:</span>
                      <span className="font-medium text-foreground">{p.harvest_window || 'Seasonal'}</span>
                    </div>
                  </div>

                  {/* Soil Chemistry Guidelines */}
                  <div className="text-[11px] text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Soil Nutrition Standards:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.nitrogen_requirement && (
                        <span className="px-2 py-0.5 rounded bg-muted text-foreground">
                          N &ge; {p.nitrogen_requirement}
                        </span>
                      )}
                      {p.phosphorus_requirement && (
                        <span className="px-2 py-0.5 rounded bg-muted text-foreground">
                          P &ge; {p.phosphorus_requirement}
                        </span>
                      )}
                      {p.potassium_requirement && (
                        <span className="px-2 py-0.5 rounded bg-muted text-foreground">
                          K &ge; {p.potassium_requirement}
                        </span>
                      )}
                      {p.organic_matter_requirement && (
                        <span className="px-2 py-0.5 rounded bg-muted text-foreground">
                          OM &ge; {p.organic_matter_requirement}%
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBag className="size-5 text-primary" />
                Publish Procurement Requirement
              </DialogTitle>
              <DialogDescription>
                Establish quality grades and quota requirements for smallholder contract farming.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crop">Target Crop</Label>
                  <select
                    id="crop"
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm transition-base focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="rice">Rice</option>
                    <option value="wheat">Wheat</option>
                    <option value="tomato">Tomato</option>
                    <option value="maize">Maize</option>
                    <option value="cotton">Cotton</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grade">Minimum Quality Grade</Label>
                  <select
                    id="grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm transition-base focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Grade A">Grade A</option>
                    <option value="Grade A+">Grade A+</option>
                    <option value="Export Quality">Export Quality</option>
                    <option value="Industrial Grade">Industrial Grade</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Required Volume (Tonnes)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Offered Price ($ / Tonne)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="minFarmSize" className="text-xs">Min. Farm Size (ha)</Label>
                  <Input
                    id="minFarmSize"
                    type="number"
                    step="0.5"
                    value={minFarmSize}
                    onChange={(e) => setMinFarmSize(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="irrigation" className="text-xs">Preferred Irrigation</Label>
                  <select
                    id="irrigation"
                    value={irrigation}
                    onChange={(e) => setIrrigation(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-2 py-1 text-xs"
                  >
                    <option value="drip">Drip</option>
                    <option value="sprinkler">Sprinkler</option>
                    <option value="flood">Flood / Surface</option>
                    <option value="rainfed">Rainfed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="moisture" className="text-xs">Max Moisture %</Label>
                  <Input
                    id="moisture"
                    type="number"
                    step="0.5"
                    value={moisture}
                    onChange={(e) => setMoisture(e.target.value)}
                  />
                </div>
              </div>

              {/* Soil Requirements */}
              <div className="p-3 bg-muted/40 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  Soil Chemistry Standards (mg/kg threshold)
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label htmlFor="nitrogen" className="text-[11px]">Nitrogen (N)</Label>
                    <Input
                      id="nitrogen"
                      type="number"
                      value={nitrogen}
                      onChange={(e) => setNitrogen(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phosphorus" className="text-[11px]">Phosphorus (P)</Label>
                    <Input
                      id="phosphorus"
                      type="number"
                      value={phosphorus}
                      onChange={(e) => setPhosphorus(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="potassium" className="text-[11px]">Potassium (K)</Label>
                    <Input
                      id="potassium"
                      type="number"
                      value={potassium}
                      onChange={(e) => setPotassium(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="organicMatter" className="text-[11px]">Organic Matter %</Label>
                    <Input
                      id="organicMatter"
                      type="number"
                      step="0.1"
                      value={organicMatter}
                      onChange={(e) => setOrganicMatter(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="harvestWindow">Harvest &amp; Sourcing Window</Label>
                <Input
                  id="harvestWindow"
                  value={harvestWindow}
                  onChange={(e) => setHarvestWindow(e.target.value)}
                  placeholder="e.g. October - November"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    'Publish Procurement Order'
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
