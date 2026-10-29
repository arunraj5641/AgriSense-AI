'use client';

import { useState } from 'react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface AddFarmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddFarmDialog({ open, onOpenChange, onSuccess }: AddFarmDialogProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [irrigationType, setIrrigationType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setLocation('');
    setFarmSize('');
    setIrrigationType('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchApi('/farms', {
        method: 'POST',
        body: JSON.stringify({
          name,
          location,
          farm_size: parseFloat(farmSize),
          irrigation_type: irrigationType || null,
        }),
      });
      toast.success('Farm created successfully!');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create farm';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Farm</DialogTitle>
          <DialogDescription>
            Enter the details of your farm. You can add crops, equipment, and more after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="farm-name">Farm Name *</Label>
            <Input
              id="farm-name"
              placeholder="e.g., Green Valley Farm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="farm-location">Location *</Label>
            <Input
              id="farm-location"
              placeholder="e.g., Central Valley, CA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="farm-size">Farm Size (acres) *</Label>
            <Input
              id="farm-size"
              type="number"
              step="0.1"
              min="0.1"
              placeholder="e.g., 150"
              value={farmSize}
              onChange={(e) => setFarmSize(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="farm-irrigation">Irrigation Type</Label>
            <Input
              id="farm-irrigation"
              placeholder="e.g., Drip, Sprinkler, Flood"
              value={irrigationType}
              onChange={(e) => setIrrigationType(e.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">Optional. Leave blank if not applicable.</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {submitting ? 'Creating...' : 'Create Farm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
