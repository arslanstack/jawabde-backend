import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAdminFlash } from '@/hooks/use-admin-flash';
import { Eye, Trash2, ChevronLeft, ChevronRight, MapPin, ExternalLink } from 'lucide-react';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { open: 'default', resolved: 'secondary', withdrawn: 'outline', unpublished: 'destructive' };

interface Complaint { id: string; status: string; description: string | null; latitude: string; longitude: string; created_at: string; resolved_at: string | null; photo_url: string | null; mobile_user: { phone: string } | null; district: { name: string }; complaint_type: { name: string }; terms: { politician: { name: string }; constituency: { code: string } }[]; }
interface Filters { status?: string; district_id?: string; complaint_type_id?: string; from?: string; to?: string; }

export default function Complaints({ complaints, districts, complaint_types, filters }: { complaints: { data: Complaint[]; current_page: number; last_page: number; total: number }; districts: { id: string; name: string }[]; complaint_types: { id: string; name: string }[]; filters: Filters; }) {
    useAdminFlash();
    const [viewing, setViewing] = useState<Complaint | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null);
    const [localFilters, setLocalFilters] = useState(filters);

    function applyFilters() { router.get('/admin/complaints', Object.fromEntries(Object.entries(localFilters).filter(([, v]) => v))); }

    return (
        <AppLayout>
            <Head title="Complaints" />
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Complaints</h1>
                        <p className="text-muted-foreground">{complaints.total} total complaints</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg">
                    <Select value={localFilters.status ?? ''} onValueChange={v => setLocalFilters(f => ({ ...f, status: v || undefined }))}>
                        <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="withdrawn">Withdrawn</SelectItem>
                            <SelectItem value="unpublished">Unpublished</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={localFilters.district_id ?? ''} onValueChange={v => setLocalFilters(f => ({ ...f, district_id: v || undefined }))}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="All Districts" /></SelectTrigger>
                        <SelectContent>{districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={localFilters.complaint_type_id ?? ''} onValueChange={v => setLocalFilters(f => ({ ...f, complaint_type_id: v || undefined }))}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
                        <SelectContent>{complaint_types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="flex items-center gap-1 text-sm"><Label className="text-muted-foreground">From</Label><Input type="date" value={localFilters.from ?? ''} onChange={e => setLocalFilters(f => ({ ...f, from: e.target.value || undefined }))} className="w-36 h-9" /></div>
                    <div className="flex items-center gap-1 text-sm"><Label className="text-muted-foreground">To</Label><Input type="date" value={localFilters.to ?? ''} onChange={e => setLocalFilters(f => ({ ...f, to: e.target.value || undefined }))} className="w-36 h-9" /></div>
                    <Button onClick={applyFilters} size="sm">Apply</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setLocalFilters({}); router.get('/admin/complaints'); }}>Clear</Button>
                </div>

                <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="p-3 text-left font-medium">ID</th>
                                <th className="p-3 text-left font-medium">Type</th>
                                <th className="p-3 text-left font-medium">District</th>
                                <th className="p-3 text-left font-medium">Status</th>
                                <th className="p-3 text-left font-medium">User</th>
                                <th className="p-3 text-left font-medium">Photo</th>
                                <th className="p-3 text-left font-medium">Date</th>
                                <th className="p-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {complaints.data.map((c) => (
                                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="p-3 font-mono text-xs">{c.id.slice(-8)}</td>
                                    <td className="p-3"><Badge variant="outline">{c.complaint_type?.name ?? '—'}</Badge></td>
                                    <td className="p-3">{c.district?.name ?? '—'}</td>
                                    <td className="p-3"><Badge variant={STATUS_COLORS[c.status] ?? 'outline'}>{c.status}</Badge></td>
                                    <td className="p-3 text-muted-foreground text-xs">{c.mobile_user?.phone ?? '—'}</td>
                                    <td className="p-3">{c.photo_url ? <img src={c.photo_url} className="h-10 w-10 object-cover rounded" alt="" /> : '—'}</td>
                                    <td className="p-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => setViewing(c)}><Eye className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Page {complaints.current_page} of {complaints.last_page}</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={complaints.current_page === 1} onClick={() => router.get('/admin/complaints', { ...filters, page: complaints.current_page - 1 })}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" disabled={complaints.current_page === complaints.last_page} onClick={() => router.get('/admin/complaints', { ...filters, page: complaints.current_page + 1 })}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>

            <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Complaint Detail</DialogTitle></DialogHeader>
                    {viewing && (
                        <div className="space-y-4">
                            {viewing.photo_url && <img src={viewing.photo_url} className="w-full max-h-64 object-cover rounded" alt="" />}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{viewing.complaint_type?.name}</span></div>
                                <div><span className="text-muted-foreground">District:</span> <span className="font-medium">{viewing.district?.name}</span></div>
                                <div><span className="text-muted-foreground">Status:</span> <Badge variant={STATUS_COLORS[viewing.status]}>{viewing.status}</Badge></div>
                                <div><span className="text-muted-foreground">User:</span> <span className="font-medium">{viewing.mobile_user?.phone ?? '—'}</span></div>
                                <div><span className="text-muted-foreground">Filed:</span> <span>{new Date(viewing.created_at).toLocaleString()}</span></div>
                                {viewing.resolved_at && <div><span className="text-muted-foreground">Resolved:</span> <span>{new Date(viewing.resolved_at).toLocaleString()}</span></div>}
                            </div>
                            {viewing.description && <p className="text-sm bg-muted p-3 rounded">{viewing.description}</p>}
                            <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <a href={`https://maps.google.com/?q=${viewing.latitude},${viewing.longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                                    {viewing.latitude}, {viewing.longitude} <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                            {viewing.terms.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium mb-1">Chittared Politicians</p>
                                    <div className="flex flex-wrap gap-1">
                                        {viewing.terms.map((t, i) => <Badge key={i} variant="secondary">{t.politician?.name} ({t.constituency?.code})</Badge>)}
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 pt-2 border-t">
                                {(['open', 'resolved', 'unpublished', 'withdrawn'] as const).map(s => (
                                    <Button key={s} size="sm" variant={viewing.status === s ? 'default' : 'outline'} onClick={() => { router.patch(`/admin/complaints/${viewing.id}/status`, { status: s }); setViewing(null); }}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete complaint?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the complaint and decrement chittar counts.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.delete(`/admin/complaints/${deleteTarget!.id}`, { onSuccess: () => setDeleteTarget(null) })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
