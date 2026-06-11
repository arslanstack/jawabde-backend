import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAdminFlash } from '@/hooks/use-admin-flash';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

interface ComplaintType { id: string; name: string; slug: string; icon: string | null; is_active: boolean; sort_order: number; }

const EMPTY = { name: '', slug: '', icon: '', is_active: true, sort_order: 0 };

function toSlug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export default function ComplaintTypes({ types }: { types: ComplaintType[] }) {
    useAdminFlash();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ComplaintType | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ComplaintType | null>(null);
    const [form, setForm] = useState<{ name: string; slug: string; icon: string; is_active: boolean; sort_order: number }>(EMPTY);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [search, setSearch] = useState('');

    const filtered = search ? types.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search.toLowerCase())) : types;

    function openCreate() { setEditing(null); setForm(EMPTY); setErrors({}); setOpen(true); }
    function openEdit(t: ComplaintType) { setEditing(t); setForm({ name: t.name, slug: t.slug, icon: t.icon ?? '', is_active: t.is_active, sort_order: t.sort_order }); setErrors({}); setOpen(true); }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const opts = { onSuccess: () => setOpen(false), onError: (errs: Record<string, string>) => setErrors(errs) };
        if (editing) router.put(`/admin/complaint-types/${editing.id}`, form, opts);
        else router.post('/admin/complaint-types', form, opts);
    }

    return (
        <AppLayout>
            <Head title="Complaint Types" />
            <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Complaint Types</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Categories citizens can report</p>
                    </div>
                    <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Type</Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search types…" className="pl-9" />
                    </div>
                    <span className="text-sm text-muted-foreground">{filtered.length} of {types.length}</span>
                </div>

                <div className="rounded-lg border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/40">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-16">Order</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[140px]">Name</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[140px]">Slug</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[120px]">Icon</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Status</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filtered.map((t) => (
                                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{t.sort_order}</td>
                                    <td className="px-4 py-3 font-medium">{t.name}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.slug}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.icon ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <button type="button" onClick={() => router.patch(`/admin/complaint-types/${t.id}/toggle-active`)}>
                                            <Badge variant={t.is_active ? 'default' : 'secondary'} className="cursor-pointer">{t.is_active ? 'Active' : 'Inactive'}</Badge>
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(t)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No types found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Complaint Type' : 'Add Complaint Type'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4 pt-2">
                        <Field label="Name" error={errors.name}>
                            <Input value={form.name} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, name: v, slug: editing ? f.slug : toSlug(v) })); }} placeholder="e.g. Pothole" autoFocus />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Slug" error={errors.slug}>
                                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g. pothole" />
                            </Field>
                            <Field label="Sort Order" error={errors.sort_order as string}>
                                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} min={0} />
                            </Field>
                        </div>
                        <Field label="Icon" error={errors.icon}>
                            <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="e.g. road, lightbulb, waves" />
                            <p className="text-xs text-muted-foreground">Lucide icon name used in the mobile app</p>
                        </Field>
                        <div className="flex items-center gap-2 pt-1">
                            <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                            <label htmlFor="is_active" className="text-sm cursor-pointer">Active (visible in mobile app)</label>
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Type</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.delete(`/admin/complaint-types/${deleteTarget!.id}`, { onSuccess: () => setDeleteTarget(null) })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium">{label}</Label>
            {children}
            {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
    );
}
