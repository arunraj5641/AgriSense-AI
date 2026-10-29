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
import { Wrench, Plus, Loader2, Package } from 'lucide-react';
import type { Equipment } from '@/types';

interface EquipmentSectionProps {
  farmId: string;
  equipment: Equipment[];
  onEquipmentAdded: (eq: Equipment) => void;
}

export function EquipmentSection({ farmId, equipment, onEquipmentAdded }: EquipmentSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [equipmentName, setEquipmentName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await fetchApi(`/resources/farms/${farmId}/equipment`, {
        method: 'POST',
        body: JSON.stringify({
          equipment_name: equipmentName,
          quantity: parseInt(quantity),
        }),
      });
      onEquipmentAdded(result);
      setEquipmentName('');
      setQuantity('1');
      setDialogOpen(false);
      toast.success('Equipment added successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add equipment';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Equipment</h3>
          <p className="text-sm text-muted-foreground">Farm equipment inventory</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="mr-2 size-4" />
          Add Equipment
        </Button>
      </div>

      {equipment.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No equipment yet"
          description="Add equipment to help AI generate better resource-aware recommendations."
          action={
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="mr-2 size-4" />
              Add Equipment
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {equipment.map((eq) => (
            <Card key={eq.id} className="transition-base hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <Package className="size-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{eq.equipment_name}</p>
                  <p className="text-xs text-muted-foreground">Equipment</p>
                </div>
                <Badge variant="secondary">
                  ×{eq.quantity}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Equipment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
            <DialogDescription>Add equipment to your farm inventory.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eq-name">Equipment Name *</Label>
              <Input
                id="eq-name"
                placeholder="e.g., Tractor, Sprinkler System"
                value={equipmentName}
                onChange={(e) => setEquipmentName(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-qty">Quantity *</Label>
              <Input
                id="eq-qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
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
                {submitting ? 'Adding...' : 'Add Equipment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
