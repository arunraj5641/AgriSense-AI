'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Users, UserPlus, Search, Filter, ShieldCheck, Loader2 } from 'lucide-react';
import type { User } from '@/types';

export default function AdminUsersPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New user form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newRole, setNewRole] = useState('extension_officer');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/admin/users');
      setUsers(data || []);
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadUsers);
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await fetchApi('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole
        })
      });
      setUsers((prev) => [created, ...prev]);
      setDialogOpen(false);
      setNewName('');
      setNewEmail('');
      toast.success(`User ${created.name} provisioned successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to provision user');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <AppShell
      title="User Governance"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'User Governance' }
      ]}
    >
      <div className="space-y-6 pb-12">
        <PageHeader
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'User Governance' }
          ]}
          title="Platform Stakeholder Management"
          description="Provision extension officers, verify food processing companies, and audit platform accounts."
          actions={
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <UserPlus className="size-4" />
              Provision New User
            </Button>
          }
        />

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs"
            >
              <option value="ALL">All Roles</option>
              <option value="farmer">Farmer</option>
              <option value="extension_officer">Extension Officer</option>
              <option value="food_processing_unit">Food Processing Unit</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3.5">Name</th>
                    <th className="px-4 py-3.5">Email</th>
                    <th className="px-4 py-3.5">System Role</th>
                    <th className="px-4 py-3.5">Member Since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-foreground">{u.name}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            u.role === 'admin'
                              ? 'default'
                              : u.role === 'extension_officer'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="capitalize text-[11px]"
                        >
                          {u.role.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Provision User Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="size-5 text-primary" />
                Provision Platform Stakeholder
              </DialogTitle>
              <DialogDescription>
                Create an authorized account for an Extension Officer, Food Processing Unit, or Farmer.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateUser} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name / Organization</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Dr. K. Swaminathan / AgriPure Corp"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="stakeholder@domain.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Assign Role</Label>
                <select
                  id="role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm transition-base"
                >
                  <option value="extension_officer">Agricultural Extension Officer</option>
                  <option value="food_processing_unit">Food Processing Unit (Company)</option>
                  <option value="farmer">Farmer</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Temporary Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Create Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
