import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAdminFlash } from '@/hooks/use-admin-flash';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

interface Province { id: string; name: string; code: string; districts_count: number; }

export default function Provinces({ provinces }: { provinces: Province[] }) {
    useAdminFlash();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Province | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Province | null>(null);
    const [search, setSearch] = useState('');

    const { data, setData, processing, errors, reset } = useForm({ name: '', code: '' });

    const filtered = search
        ? provinces.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
        : provinces;

    function openCreate() { setEditing(null); reset(); setOpen(true); }
    function openEdit(p: Province) { setEditing(p); setData({ name: p.name, code: p.code }); setOpen(true); }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const opts = {
            onSuccess: () => { setOpen(false); reset(); },
            onError: () => toast.error('Please fix the errors below.'),
        };
        if (editing) router.put(`/admin/provinces/${editing.id}`, data, opts);
        else router.post('/admin/provinces', data, opts);
    }

    return (
        <AppLayout>
            <Head title="Provinces" />
            <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Provinces</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Manage Pakistan's provinces and territories</p>
                    </div>
                    <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Province</Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search provinces…" className="pl-9" />
                    </div>
                    <span className="text-sm text-muted-foreground">{filtered.length} of {provinces.length}</span>
                </div>

                <div className="rounded-lg border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/40">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Code</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Districts</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filtered.map((p) => (
                                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 font-medium">{p.name}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{p.districts_count}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(p)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No provinces found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Province' : 'Add Province'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4 pt-2">
                        <Field label="Name" error={errors.name}>
                            <Input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="e.g. Punjab" autoFocus />
                        </Field>
                        <Field label="Code" error={errors.code}>
                            <Input value={data.code} onChange={e => setData('code', e.target.value.toUpperCase())} maxLength={5} placeholder="e.g. PB" className="uppercase" />
                            <p className="text-xs text-muted-foreground">2–5 character unique identifier</p>
                        </Field>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={processing}>{processing ? 'Saving…' : 'Save Province'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone. All associated districts must be removed first.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.delete(`/admin/provinces/${deleteTarget!.id}`, { onSuccess: () => setDeleteTarget(null) })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
