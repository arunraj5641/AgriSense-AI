'use client';

import { useState } from 'react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DollarSign, Loader2, TrendingUp, Wallet } from 'lucide-react';
import type { Budget } from '@/types';

interface BudgetSectionProps {
  farmId: string;
  budget: Budget | null;
  onBudgetUpdated: (budget: Budget) => void;
}

export function BudgetSection({ farmId, budget, onBudgetUpdated }: BudgetSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availableBudget, setAvailableBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await fetchApi(`/resources/farms/${farmId}/budget`, {
        method: 'POST',
        body: JSON.stringify({ available_budget: parseFloat(availableBudget) }),
      });
      onBudgetUpdated(result);
      setAvailableBudget('');
      setDialogOpen(false);
      toast.success('Budget updated successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update budget';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Budget</h3>
          <p className="text-sm text-muted-foreground">Financial overview and budget management</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          {budget ? 'Update Budget' : 'Set Budget'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="transition-base hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="size-4" />
              Available Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {budget ? `$${budget.available_budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
            </p>
            {!budget && (
              <p className="mt-2 text-sm text-muted-foreground">
                No budget set yet. Set one to get cost-aware recommendations.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="transition-base hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="size-4" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {budget ? 'Active' : 'Pending'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {budget
                ? `Last updated: ${new Date(budget.updated_at || budget.created_at).toLocaleDateString()}`
                : 'Set your budget to activate cost tracking'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Update Budget Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{budget ? 'Update Budget' : 'Set Budget'}</DialogTitle>
            <DialogDescription>
              {budget
                ? `Current budget: $${budget.available_budget.toFixed(2)}. Enter the new amount.`
                : 'Set your available budget for AI recommendations.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget-amount">Available Budget ($) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="budget-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 50000"
                  value={availableBudget}
                  onChange={(e) => setAvailableBudget(e.target.value)}
                  required
                  disabled={submitting}
                  className="pl-9"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {submitting ? 'Saving...' : 'Save Budget'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
