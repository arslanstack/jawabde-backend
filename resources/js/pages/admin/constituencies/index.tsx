import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAdminFlash } from '@/hooks/use-admin-flash';
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Province { id: string; name: string; }
interface DistrictOption { id: string; name: string; province_id: string; }
interface TypeOption { id: string; name: string; short_code: string; }
interface PoliticianOption { id: string; name: string; }
interface Constituency { id: string; code: string; name: string; type: TypeOption; district: { id: string; name: string; province: Province }; current_term: { politician: { name: string } } | null; }
interface Paginated { data: Constituency[]; current_page: number; last_page: number; total: number; }

const EMPTY = { code: '', name: '', type_id: '', district_id: '', politician_id: '' };

export default function Constituencies({ constituencies, types, provinces, districts, politicians, filters }: {
    constituencies: Paginated; types: TypeOption[]; provinces: Province[]; districts: DistrictOption[]; politicians: PoliticianOption[]; filters: { search?: string };
}) {
    useAdminFlash();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Constituency | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Constituency | null>(null);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [search, setSearch] = useState(filters.search ?? '');

    useEffect(() => {
        const t = setTimeout(() => {
            if (search !== (filters.search ?? '')) {
                router.get('/admin/constituencies', search ? { search } : {}, { preserveState: true, replace: true });
            }
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const typeOptions = types.map(t => ({ value: t.id, label: `${t.short_code} — ${t.name}` }));
    const districtOptions = districts.map(d => ({ value: d.id, label: d.name }));
    const politicianOptions = politicians.map(p => ({ value: p.id, label: p.name }));

    function openCreate() { setEditing(null); setForm(EMPTY); setErrors({}); setOpen(true); }
    function openEdit(c: Constituency) {
        setEditing(c);
        const currentPoliticianId = politicians.find(p => p.name === c.current_term?.politician?.name)?.id ?? '';
        setForm({ code: c.code, name: c.name, type_id: c.type.id, district_id: c.district.id, politician_id: currentPoliticianId });
        setErrors({}); setOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const opts = { onSuccess: () => setOpen(false), onError: (errs: Record<string, string>) => setErrors(errs) };
        if (editing) router.put(`/admin/constituencies/${editing.id}`, form, opts);
        else router.post('/admin/constituencies', form, opts);
    }

    return (
        <AppLayout>
            <Head title="Constituencies" />
            <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Constituencies</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">{constituencies.total} constituencies across Pakistan</p>
                    </div>
                    <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Constituency</Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code or name…" className="pl-9" />
                    </div>
                    <span className="text-sm text-muted-foreground">Page {constituencies.current_page} of {constituencies.last_page}</span>
                </div>

                <div className="rounded-lg border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/40">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Code</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[160px]">Name</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-16">Type</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[120px]">District</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[110px]">Province</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[150px]">Current Rep</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {constituencies.data.map((c) => (
                                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 font-mono font-medium text-xs">{c.code}</td>
                                    <td className="px-4 py-3">{c.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.type?.short_code ?? '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{c.district?.name ?? '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{c.district?.province?.name ?? '—'}</td>
                                    <td className="px-4 py-3 text-sm">{c.current_term?.politician?.name ?? <span className="text-muted-foreground/50">Vacant</span>}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(c)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {constituencies.data.length === 0 && (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No constituencies found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{constituencies.total} total records</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={constituencies.current_page === 1} onClick={() => router.get('/admin/constituencies', { search, page: constituencies.current_page - 1 })}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" disabled={constituencies.current_page === constituencies.last_page} onClick={() => router.get('/admin/constituencies', { search, page: constituencies.current_page + 1 })}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Constituency' : 'Add Constituency'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Code" error={errors.code}>
                                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. NA-118" autoFocus />
                            </Field>
                            <Field label="Name" error={errors.name}>
                                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Lahore-II" />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Assembly Type" error={errors.type_id}>
                                <SearchableSelect options={typeOptions} value={form.type_id} onChange={v => setForm(f => ({ ...f, type_id: v }))} placeholder="Select type…" />
                            </Field>
                            <Field label="District" error={errors.district_id}>
                                <SearchableSelect options={districtOptions} value={form.district_id} onChange={v => setForm(f => ({ ...f, district_id: v }))} placeholder="Select district…" />
                            </Field>
                        </div>
                        <div className="border-t pt-4">
                            <Field label="Current Seat Holder (optional)" error={errors.politician_id}>
                                <SearchableSelect options={politicianOptions} value={form.politician_id} onChange={v => setForm(f => ({ ...f, politician_id: v }))} placeholder="Leave blank if vacant…" />
                                <p className="text-xs text-muted-foreground mt-1">Setting this will create or update the current term for this constituency.</p>
                            </Field>
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Constituency</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleteTarget?.code}?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone. Remove all terms for this constituency first.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.delete(`/admin/constituencies/${deleteTarget!.id}`, { onSuccess: () => setDeleteTarget(null) })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
