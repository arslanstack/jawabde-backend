import { Head, router } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SearchableSelect } from '@/components/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAdminFlash } from '@/hooks/use-admin-flash';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X, Search, ImageIcon } from 'lucide-react';

interface ConstituencyOption { id: string; code: string; name: string; }
interface Politician { id: string; name: string; party: string | null; photo_path: string | null; photo_url: string | null; current_term: { constituency: { code: string; type: { short_code: string } } } | null; terms_sum_chittar_count: number | null; }
interface Paginated { data: Politician[]; current_page: number; last_page: number; total: number; }

export default function Politicians({ politicians, constituencies, filters }: { politicians: Paginated; constituencies: ConstituencyOption[]; filters: { search?: string } }) {
    useAdminFlash();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Politician | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Politician | null>(null);
    const [name, setName] = useState('');
    const [party, setParty] = useState('');
    const [constituencyId, setConstituencyId] = useState('');
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [removePhoto, setRemovePhoto] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [search, setSearch] = useState(filters.search ?? '');

    useEffect(() => {
        const t = setTimeout(() => {
            if (search !== (filters.search ?? '')) {
                router.get('/admin/politicians', search ? { search } : {}, { preserveState: true, replace: true });
            }
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const constituencyOptions = constituencies.map(c => ({ value: c.id, label: `${c.code} — ${c.name}` }));

    function openCreate() { setEditing(null); setName(''); setParty(''); setConstituencyId(''); setPhotoPreview(null); setRemovePhoto(false); setErrors({}); setOpen(true); }
    function openEdit(p: Politician) {
        setEditing(p); setName(p.name); setParty(p.party ?? '');
        const cId = constituencies.find(c => c.code === p.current_term?.constituency?.code)?.id ?? '';
        setConstituencyId(cId);
        setPhotoPreview(p.photo_url); setRemovePhoto(false); setErrors({}); setOpen(true);
    }

    function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) { setPhotoPreview(URL.createObjectURL(file)); setRemovePhoto(false); }
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const fd = new FormData();
        fd.append('name', name);
        fd.append('party', party);
        if (constituencyId) fd.append('constituency_id', constituencyId);
        if (fileRef.current?.files?.[0]) fd.append('photo', fileRef.current.files[0]);
        if (removePhoto) fd.append('remove_photo', '1');
        const opts = {
            onSuccess: () => setOpen(false),
            onError: (errs: Record<string, string>) => { setErrors(errs); toast.error('Please fix the errors below.'); },
            forceFormData: true,
        };
        if (editing) { fd.append('_method', 'PUT'); router.post(`/admin/politicians/${editing.id}`, fd, opts); }
        else router.post('/admin/politicians', fd, opts);
    }

    return (
        <AppLayout>
            <Head title="Politicians" />
            <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Politicians</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">{politicians.total} politicians in database</p>
                    </div>
                    <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Politician</Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or party…" className="pl-9" />
                    </div>
                    <span className="text-sm text-muted-foreground">Page {politicians.current_page} of {politicians.last_page}</span>
                </div>

                <div className="rounded-lg border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/40">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12"></th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[160px]">Name</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[100px]">Party</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Seat</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Chittars</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {politicians.data.map((p) => (
                                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={p.photo_url ?? undefined} />
                                            <AvatarFallback className="text-xs">{p.name[0]}</AvatarFallback>
                                        </Avatar>
                                    </td>
                                    <td className="px-4 py-3 font-medium">{p.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{p.party ?? '—'}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{p.current_term?.constituency?.code ?? <span className="text-muted-foreground/50">—</span>}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{p.terms_sum_chittar_count ?? 0}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(p)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {politicians.data.length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No politicians found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{politicians.total} total records</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={politicians.current_page === 1} onClick={() => router.get('/admin/politicians', { search, page: politicians.current_page - 1 })}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" disabled={politicians.current_page === politicians.last_page} onClick={() => router.get('/admin/politicians', { search, page: politicians.current_page + 1 })}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Politician' : 'Add Politician'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4 pt-2">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                {photoPreview && !removePhoto ? (
                                    <div className="relative">
                                        <img src={photoPreview} className="w-20 h-20 object-cover rounded-lg border" alt="" />
                                        <button type="button" className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm"
                                            onClick={() => { setPhotoPreview(null); setRemovePhoto(true); if (fileRef.current) fileRef.current.value = ''; }}>
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/20">
                                        <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 space-y-3">
                                <Field label="Full Name" error={errors.name}>
                                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hamza Shahbaz" autoFocus />
                                </Field>
                                <Field label="Party" error={errors.party}>
                                    <Input value={party} onChange={e => setParty(e.target.value)} placeholder="e.g. PML(N)" />
                                </Field>
                            </div>
                        </div>

                        <Field label="Photo" error={errors.photo}>
                            <Input type="file" accept="image/jpg,image/jpeg,image/png,image/webp" ref={fileRef} onChange={handlePhoto} className="text-sm" />
                            <p className="text-xs text-muted-foreground">JPG, PNG or WebP, max 2MB</p>
                        </Field>

                        <div className="border-t pt-4">
                            <Field label="Current Seat / Constituency (optional)" error={errors.constituency_id}>
                                <SearchableSelect options={constituencyOptions} value={constituencyId} onChange={setConstituencyId} placeholder="Leave blank to assign later…" />
                                <p className="text-xs text-muted-foreground mt-1">Setting this will create or update the current term for this politician.</p>
                            </Field>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Politician</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone. Remove all terms for this politician first.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.delete(`/admin/politicians/${deleteTarget!.id}`, { onSuccess: () => setDeleteTarget(null) })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
