import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { SearchableSelect } from '@/components/searchable-select';
import { useAdminFlash } from '@/hooks/use-admin-flash';
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Province { id: string; name: string; }
interface District { id: string; pcode: string; name: string; division: string | null; center_lat: string | null; center_lon: string | null; province: Province; }
interface Paginated { data: District[]; current_page: number; last_page: number; total: number; }

const EMPTY = { pcode: '', name: '', province_id: '', division: '', center_lat: '', center_lon: '' };

export default function Districts({ districts, provinces, filters }: { districts: Paginated; provinces: Province[]; filters: { search?: string } }) {
    useAdminFlash();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<District | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<District | null>(null);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [search, setSearch] = useState(filters.search ?? '');

    useEffect(() => {
        const t = setTimeout(() => {
            if (search !== (filters.search ?? '')) {
                router.get('/admin/districts', search ? { search } : {}, { preserveState: true, replace: true });
            }
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const provinceOptions = provinces.map(p => ({ value: p.id, label: p.name }));

    function openCreate() { setEditing(null); setForm(EMPTY); setErrors({}); setOpen(true); }
    function openEdit(d: District) {
        setEditing(d);
        setForm({ pcode: d.pcode, name: d.name, province_id: d.province.id, division: d.division ?? '', center_lat: d.center_lat ?? '', center_lon: d.center_lon ?? '' });
        setErrors({}); setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const opts = { onSuccess: () => setOpen(false), onError: (errs: Record<string, string>) => setErrors(errs) };
        if (editing) router.put(`/admin/districts/${editing.id}`, form, opts);
        else router.post('/admin/districts', form, opts);
    }

    return (
        <AppLayout>
            <Head title="Districts" />
            <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Districts</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">{districts.total} districts across Pakistan</p>
                    </div>
                    <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add District</Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or pcode…" className="pl-9" />
                    </div>
                    <span className="text-sm text-muted-foreground">Page {districts.current_page} of {districts.last_page}</span>
                </div>

                <div className="rounded-lg border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/40">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[140px]">Name</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[110px]">Province</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[120px]">Division</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Pcode</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[150px]">Coordinates</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {districts.data.map((d) => (
                                <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 font-medium">{d.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{d.province.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{d.division ?? '—'}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{d.pcode}</td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{d.center_lat && d.center_lon ? `${d.center_lat}, ${d.center_lon}` : '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(d)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {districts.data.length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No districts found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{districts.total} total records</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={districts.current_page === 1} onClick={() => router.get('/admin/districts', { search, page: districts.current_page - 1 })}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" disabled={districts.current_page === districts.last_page} onClick={() => router.get('/admin/districts', { search, page: districts.current_page + 1 })}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit District' : 'Add District'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Name" error={errors.name} className="col-span-2">
                                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Lahore" autoFocus />
                            </Field>
                            <Field label="Province" error={errors.province_id} className="col-span-2">
                                <SearchableSelect options={provinceOptions} value={form.province_id} onChange={v => setForm(f => ({ ...f, province_id: v }))} placeholder="Select province…" />
                            </Field>
                            <Field label="Pcode" error={errors.pcode}>
                                <Input value={form.pcode} onChange={e => setForm(f => ({ ...f, pcode: e.target.value }))} placeholder="e.g. PK609" />
                            </Field>
                            <Field label="Division" error={errors.division}>
                                <Input value={form.division} onChange={e => setForm(f => ({ ...f, division: e.target.value }))} placeholder="Optional" />
                            </Field>
                            <Field label="Center Latitude" error={errors.center_lat}>
                                <Input type="number" step="any" value={form.center_lat} onChange={e => setForm(f => ({ ...f, center_lat: e.target.value }))} placeholder="e.g. 31.5497" />
                            </Field>
                            <Field label="Center Longitude" error={errors.center_lon}>
                                <Input type="number" step="any" value={form.center_lon} onChange={e => setForm(f => ({ ...f, center_lon: e.target.value }))} placeholder="e.g. 74.3436" />
                            </Field>
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit">Save District</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone. Remove all constituencies first.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.delete(`/admin/districts/${deleteTarget!.id}`, { onSuccess: () => setDeleteTarget(null) })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`space-y-1.5 ${className ?? ''}`}>
            <Label className="text-sm font-medium">{label}</Label>
            {children}
            {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
    );
}
