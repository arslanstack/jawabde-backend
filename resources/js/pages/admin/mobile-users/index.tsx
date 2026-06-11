import { Head, router, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAdminFlash } from '@/hooks/use-admin-flash';
import { Eye, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface MobileUser { id: string; name: string | null; phone: string; is_active: boolean; complaints_count: number; created_at: string; }
interface Paginated { data: MobileUser[]; current_page: number; last_page: number; total: number; }

export default function MobileUsers({ users, filters }: { users: Paginated; filters: { search?: string } }) {
    useAdminFlash();
    const [deleteTarget, setDeleteTarget] = useState<MobileUser | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');

    useEffect(() => {
        const t = setTimeout(() => {
            if (search !== (filters.search ?? '')) {
                router.get('/admin/mobile-users', search ? { search } : {}, { preserveState: true, replace: true });
            }
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    return (
        <AppLayout>
            <Head title="Mobile Users" />
            <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Mobile Users</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">{users.total} registered users</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by phone or name…" className="pl-9" />
                    </div>
                    <span className="text-sm text-muted-foreground">Page {users.current_page} of {users.last_page}</span>
                </div>

                <div className="rounded-lg border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/40">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[130px]">Name</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[140px]">Phone</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Status</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Complaints</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[110px]">Joined</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.data.map((u) => (
                                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 font-medium">{u.name ?? <span className="text-muted-foreground/50">—</span>}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{u.phone}</td>
                                    <td className="px-4 py-3">
                                        <button type="button" onClick={() => router.patch(`/admin/mobile-users/${u.id}/toggle-active`)}>
                                            <Badge variant={u.is_active ? 'default' : 'destructive'} className="cursor-pointer">{u.is_active ? 'Active' : 'Suspended'}</Badge>
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{u.complaints_count}</td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild><Link href={`/admin/mobile-users/${u.id}`}><Eye className="h-3.5 w-3.5" /></Link></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(u)} disabled={u.complaints_count > 0}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.data.length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{users.total} total records</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={users.current_page === 1} onClick={() => router.get('/admin/mobile-users', { search, page: users.current_page - 1 })}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" disabled={users.current_page === users.last_page} onClick={() => router.get('/admin/mobile-users', { search, page: users.current_page + 1 })}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>

            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete user {deleteTarget?.phone}?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.delete(`/admin/mobile-users/${deleteTarget!.id}`, { onSuccess: () => setDeleteTarget(null) })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
