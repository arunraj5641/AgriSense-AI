'use client';

import { useState } from 'react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FlaskConical, Loader2 } from 'lucide-react';
import type { SoilReport } from '@/types';

interface SoilSectionProps {
  farmId: string;
  soilReport: SoilReport | null;
  onSoilUpdated: (report: SoilReport) => void;
}

const nutrientConfig = [
  { key: 'nitrogen' as const, label: 'Nitrogen (N)', color: 'bg-green-500', max: 200, unit: 'mg/kg' },
  { key: 'phosphorus' as const, label: 'Phosphorus (P)', color: 'bg-blue-500', max: 100, unit: 'mg/kg' },
  { key: 'potassium' as const, label: 'Potassium (K)', color: 'bg-purple-500', max: 300, unit: 'mg/kg' },
  { key: 'organic_matter' as const, label: 'Organic Matter', color: 'bg-amber-500', max: 10, unit: '%' },
];

export function SoilSection({ farmId, soilReport, onSoilUpdated }: SoilSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nitrogen, setNitrogen] = useState('');
  const [phosphorus, setPhosphorus] = useState('');
  const [potassium, setPotassium] = useState('');
  const [organicMatter, setOrganicMatter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, number> = {};
      if (nitrogen) payload.nitrogen = parseFloat(nitrogen);
      if (phosphorus) payload.phosphorus = parseFloat(phosphorus);
      if (potassium) payload.potassium = parseFloat(potassium);
      if (organicMatter) payload.organic_matter = parseFloat(organicMatter);

      const result = await fetchApi(`/resources/farms/${farmId}/soil-report`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onSoilUpdated(result);
      setNitrogen('');
      setPhosphorus('');
      setPotassium('');
      setOrganicMatter('');
      setDialogOpen(false);
      toast.success('Soil report updated successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update soil report';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Soil Report</h3>
          <p className="text-sm text-muted-foreground">Soil nutrient analysis and composition</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          {soilReport ? 'Update Report' : 'Add Report'}
        </Button>
      </div>

      {!soilReport ? (
        <EmptyState
          icon={FlaskConical}
          title="No soil report"
          description="Add a soil report to get nutrient-aware recommendations for your farm."
          action={
            <Button onClick={() => setDialogOpen(true)} size="sm">
              Add Soil Report
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {nutrientConfig.map((nutrient) => {
            const value = soilReport[nutrient.key];
            const percentage = value != null ? Math.min((value / nutrient.max) * 100, 100) : 0;
            return (
              <Card key={nutrient.key} className="transition-base hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {nutrient.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {value != null ? value : 'N/A'}
                    {value != null && (
                      <span className="ml-1 text-sm font-normal text-muted-foreground">{nutrient.unit}</span>
                    )}
                  </p>
                  {value != null && (
                    <div className="mt-3">
                      <Progress value={percentage} className="h-2" />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {percentage.toFixed(0)}% of optimal range (0–{nutrient.max} {nutrient.unit})
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Update Soil Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{soilReport ? 'Update Soil Report' : 'Add Soil Report'}</DialogTitle>
            <DialogDescription>Enter your soil analysis results. All fields are optional.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="soil-n">Nitrogen (mg/kg)</Label>
                <Input
                  id="soil-n"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 45.5"
                  value={nitrogen}
                  onChange={(e) => setNitrogen(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="soil-p">Phosphorus (mg/kg)</Label>
                <Input
                  id="soil-p"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 22.3"
                  value={phosphorus}
                  onChange={(e) => setPhosphorus(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="soil-k">Potassium (mg/kg)</Label>
                <Input
                  id="soil-k"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 180"
                  value={potassium}
                  onChange={(e) => setPotassium(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="soil-om">Organic Matter (%)</Label>
                <Input
                  id="soil-om"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 3.2"
                  value={organicMatter}
                  onChange={(e) => setOrganicMatter(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {submitting ? 'Saving...' : 'Save Report'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
