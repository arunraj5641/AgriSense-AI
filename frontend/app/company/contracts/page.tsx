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
import { Handshake, CheckCircle2, XCircle, Search, Filter, Loader2, Sparkles } from 'lucide-react';
import type { Contract, ContractStatus } from '@/types';

export default function CompanyContractsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/contracts');
      setContracts(data || []);
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const handleUpdateStatus = async (contractId: string, newStatus: ContractStatus, reason?: string) => {
    setActionLoading(true);
    try {
      const updated: Contract = await fetchApi(`/contracts/${contractId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: newStatus,
          rejection_reason: reason || null
        })
      });
      setContracts((prev) => prev.map((c) => (c.id === contractId ? updated : c)));
      setDialogOpen(false);
      toast.success(`Contract updated to ${newStatus.replace('_', ' ')}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update contract');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredContracts = contracts.filter((c) => {
    if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        c.farmer_name.toLowerCase().includes(s) ||
        c.farm_name.toLowerCase().includes(s) ||
        c.crop.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <AppShell
      title="Company Contracts"
      breadcrumbs={[
        { label: 'Portal', href: '/company' },
        { label: 'Contract Management' }
      ]}
    >
      <div className="space-y-6 pb-12">
        <PageHeader
          breadcrumbs={[
            { label: 'Portal', href: '/company' },
            { label: 'Contract Management' }
          ]}
          title="Contract Farming Agreements"
          description="Review smallholder applications, finalize contract farming quotas, and monitor delivery milestones."
        />

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by farmer, farm, or crop..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPLICATION_SUBMITTED">Application Submitted</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="HARVEST_READY">Harvest Ready</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : filteredContracts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Handshake className="size-12 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold text-foreground">No Contracts Found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {filterStatus !== 'ALL'
                  ? 'Try clearing your filter criteria to view all contract submissions.'
                  : 'Farmer contract submissions will appear here once farmers apply for your procurement orders.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3.5">Farmer &amp; Farm</th>
                    <th className="px-4 py-3.5">Crop</th>
                    <th className="px-4 py-3.5">Agreed Quantity</th>
                    <th className="px-4 py-3.5">Contract Price</th>
                    <th className="px-4 py-3.5">Total Value</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredContracts.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-foreground">{c.farmer_name}</p>
                        <p className="text-xs text-muted-foreground">{c.farm_name} • {c.farmer_email}</p>
                      </td>
                      <td className="px-4 py-3.5 capitalize font-medium">{c.crop}</td>
                      <td className="px-4 py-3.5">{c.agreed_quantity} Tonnes</td>
                      <td className="px-4 py-3.5 font-medium text-foreground">${c.agreed_price.toLocaleString()} / T</td>
                      <td className="px-4 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        ${(c.agreed_quantity * c.agreed_price).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            c.status === 'ACCEPTED' || c.status === 'COMPLETED'
                              ? 'default'
                              : c.status === 'APPLICATION_SUBMITTED'
                              ? 'outline'
                              : c.status === 'HARVEST_READY'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-[11px]"
                        >
                          {c.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.status === 'APPLICATION_SUBMITTED' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-8 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => handleUpdateStatus(c.id, 'ACCEPTED')}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setSelectedContract(c);
                                  setDialogOpen(true);
                                }}
                              >
                                Decline
                              </Button>
                            </>
                          )}
                          {c.status === 'HARVEST_READY' && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 text-xs"
                              onClick={() => handleUpdateStatus(c.id, 'COMPLETED')}
                            >
                              Confirm Delivery
                            </Button>
                          )}
                          {c.status === 'ACCEPTED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => handleUpdateStatus(c.id, 'IN_PROGRESS')}
                            >
                              Start Sourcing
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Decline Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Decline Contract Application</DialogTitle>
              <DialogDescription>
                Provide a reason for declining this smallholder contract application.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input
                placeholder="Reason (e.g., Sourcing quota reached, soil moisture mismatch)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={actionLoading}
                onClick={() => {
                  if (selectedContract) {
                    handleUpdateStatus(selectedContract.id, 'ARCHIVED', rejectionReason);
                  }
                }}
              >
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : 'Decline Application'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
