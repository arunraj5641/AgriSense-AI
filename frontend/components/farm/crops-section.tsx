'use client';

import { useState } from 'react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Sprout, Plus, Loader2, Calendar, Leaf } from 'lucide-react';
import type { Crop } from '@/types';

interface CropsSectionProps {
  farmId: string;
  crops: Crop[];
  onCropAdded: (crop: Crop) => void;
}

export function CropsSection({ farmId, crops, onCropAdded }: CropsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cropType, setCropType] = useState('');
  const [cropStage, setCropStage] = useState('');
  const [sowingDate, setSowingDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await fetchApi(`/resources/farms/${farmId}/crops`, {
        method: 'POST',
        body: JSON.stringify({
          crop_type: cropType,
          crop_stage: cropStage,
          sowing_date: sowingDate,
        }),
      });
      onCropAdded(result);
      setCropType('');
      setCropStage('');
      setSowingDate('');
      setDialogOpen(false);
      toast.success('Crop added successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add crop';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Crops</h3>
          <p className="text-sm text-muted-foreground">Manage crops on this farm</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="mr-2 size-4" />
          Add Crop
        </Button>
      </div>

      {crops.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No crops yet"
          description="Add your first crop to start tracking growth stages and get recommendations."
          action={
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="mr-2 size-4" />
              Add Crop
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {crops.map((crop) => (
            <Card key={crop.id} className="transition-base hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
                      <Leaf className="size-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{crop.crop_type}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3" />
                        Sown: {crop.sowing_date}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {crop.crop_stage}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Crop Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Crop</DialogTitle>
            <DialogDescription>Add a new crop to this farm.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="crop-type">Crop Type *</Label>
              <Input
                id="crop-type"
                placeholder="e.g., Wheat, Rice, Corn"
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crop-stage">Growth Stage *</Label>
              <Input
                id="crop-stage"
                placeholder="e.g., vegetative, flowering, harvest"
                value={cropStage}
                onChange={(e) => setCropStage(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sowing-date">Sowing Date *</Label>
              <Input
                id="sowing-date"
                type="date"
                value={sowingDate}
                onChange={(e) => setSowingDate(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {submitting ? 'Adding...' : 'Add Crop'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
