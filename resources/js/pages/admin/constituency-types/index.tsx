import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAdminFlash } from '@/hooks/use-admin-flash';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

interface ConstituencyType { id: string; name: string; short_code: string; level: string; constituencies_count: number; }

const EMPTY = { name: '', short_code: '', level: '' };
const LEVEL_OPTIONS = [{ value: 'national', label: 'National' }, { value: 'provincial', label: 'Provincial' }];

export default function ConstituencyTypes({ types }: { types: ConstituencyType[] }) {
    useAdminFlash();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ConstituencyType | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ConstituencyType | null>(null);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [search, setSearch] = useState('');

    const filtered = search ? types.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.short_code.toLowerCase().includes(search.toLowerCase())) : types;

    function openCreate() { setEditing(null); setForm(EMPTY); setErrors({}); setOpen(true); }
    function openEdit(t: ConstituencyType) { setEditing(t); setForm({ name: t.name, short_code: t.short_code, level: t.level }); setErrors({}); setOpen(true); }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const opts = { onSuccess: () => setOpen(false), onError: (errs: Record<string, string>) => setErrors(errs) };
        if (editing) router.put(`/admin/constituency-types/${editing.id}`, form, opts);
        else router.post('/admin/constituency-types', form, opts);
    }

    return (
        <AppLayout>
            <Head title="Constituency Types" />
            <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Constituency Types</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">National and provincial assembly types</p>
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
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Code</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Level</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-36">Constituencies</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filtered.map((t) => (
                                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 font-medium">{t.name}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{t.short_code}</td>
                                    <td className="px-4 py-3"><Badge variant={t.level === 'national' ? 'default' : 'secondary'}>{t.level}</Badge></td>
                                    <td className="px-4 py-3 text-muted-foreground">{t.constituencies_count}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(t)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No types found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Constituency Type' : 'Add Constituency Type'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4 pt-2">
                        <Field label="Name" error={errors.name}>
                            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Punjab Assembly" autoFocus />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Short Code" error={errors.short_code}>
                                <Input value={form.short_code} onChange={e => setForm(f => ({ ...f, short_code: e.target.value.toUpperCase() }))} maxLength={5} placeholder="e.g. PP" />
                            </Field>
                            <Field label="Level" error={errors.level}>
                                <SearchableSelect options={LEVEL_OPTIONS} value={form.level} onChange={v => setForm(f => ({ ...f, level: v }))} placeholder="Select level…" />
                            </Field>
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
                        <AlertDialogDescription>This cannot be undone. Remove all constituencies of this type first.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.delete(`/admin/constituency-types/${deleteTarget!.id}`, { onSuccess: () => setDeleteTarget(null) })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
