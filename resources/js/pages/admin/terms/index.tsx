import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAdminFlash } from '@/hooks/use-admin-flash';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface Term { id: string; election_year: number; is_current: boolean; chittar_count: number; politician: { id: string; name: string }; constituency: { id: string; code: string; name: string; type: { short_code: string } }; }
interface Paginated { data: Term[]; current_page: number; last_page: number; total: number; }
interface PoliticianOption { id: string; name: string; }
interface ConstituencyOption { id: string; code: string; name: string; }

const EMPTY = { politician_id: '', constituency_id: '', election_year: '2024', is_current: true };

export default function Terms({ terms, politicians, constituencies, filters }: { terms: Paginated; politicians: PoliticianOption[]; constituencies: ConstituencyOption[]; filters: { search?: string } }) {
    useAdminFlash();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Term | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Term | null>(null);
    const [form, setForm] = useState<{ politician_id: string; constituency_id: string; election_year: string; is_current: boolean }>(EMPTY);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [search, setSearch] = useState(filters.search ?? '');

    useEffect(() => {
        const t = setTimeout(() => {
            if (search !== (filters.search ?? '')) {
                router.get('/admin/terms', search ? { search } : {}, { preserveState: true, replace: true });
            }
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const politicianOptions = politicians.map(p => ({ value: p.id, label: p.name }));
    const constituencyOptions = constituencies.map(c => ({ value: c.id, label: `${c.code} — ${c.name}` }));

    function openCreate() { setEditing(null); setForm(EMPTY); setErrors({}); setOpen(true); }
    function openEdit(t: Term) { setEditing(t); setForm({ politician_id: t.politician.id, constituency_id: t.constituency.id, election_year: String(t.election_year), is_current: t.is_current }); setErrors({}); setOpen(true); }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const opts = { onSuccess: () => setOpen(false), onError: (errs: Record<string, string>) => setErrors(errs) };
        if (editing) router.put(`/admin/terms/${editing.id}`, form, opts);
        else router.post('/admin/terms', form, opts);
    }

    return (
        <AppLayout>
            <Head title="Terms" />
            <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Terms</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">{terms.total} politician terms on record</p>
                    </div>
                    <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Term</Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by politician or seat…" className="pl-9" />
                    </div>
                    <span className="text-sm text-muted-foreground">Page {terms.current_page} of {terms.last_page}</span>
                </div>

                <div className="rounded-lg border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/40">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[160px]">Politician</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[100px]">Constituency</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Year</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Current</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Chittars</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {terms.data.map((t) => (
                                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 font-medium">{t.politician?.name ?? '—'}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{t.constituency?.code ?? '—'}</td>
                                    <td className="px-4 py-3">{t.election_year}</td>
                                    <td className="px-4 py-3"><Badge variant={t.is_current ? 'default' : 'secondary'}>{t.is_current ? 'Yes' : 'No'}</Badge></td>
                                    <td className="px-4 py-3 text-muted-foreground">{t.chittar_count}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(t)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {terms.data.length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No terms found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{terms.total} total records</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={terms.current_page === 1} onClick={() => router.get('/admin/terms', { search, page: terms.current_page - 1 })}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" disabled={terms.current_page === terms.last_page} onClick={() => router.get('/admin/terms', { search, page: terms.current_page + 1 })}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Term' : 'Add Term'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4 pt-2">
                        <Field label="Politician" error={errors.politician_id}>
                            <SearchableSelect options={politicianOptions} value={form.politician_id} onChange={v => setForm(f => ({ ...f, politician_id: v }))} placeholder="Search politician…" />
                        </Field>
                        <Field label="Constituency" error={errors.constituency_id}>
                            <SearchableSelect options={constituencyOptions} value={form.constituency_id} onChange={v => setForm(f => ({ ...f, constituency_id: v }))} placeholder="Search constituency…" />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Election Year" error={errors.election_year}>
                                <Input type="number" value={form.election_year} onChange={e => setForm(f => ({ ...f, election_year: e.target.value }))} min={1900} max={2100} />
                            </Field>
                            <Field label="Status">
                                <div className="flex items-center gap-2 h-9 pt-0.5">
                                    <input type="checkbox" id="is_current" checked={form.is_current} onChange={e => setForm(f => ({ ...f, is_current: e.target.checked }))} className="rounded" />
                                    <label htmlFor="is_current" className="text-sm cursor-pointer">Current term</label>
                                </div>
                            </Field>
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Term</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete term for {deleteTarget?.politician?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.delete(`/admin/terms/${deleteTarget!.id}`, { onSuccess: () => setDeleteTarget(null) })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
