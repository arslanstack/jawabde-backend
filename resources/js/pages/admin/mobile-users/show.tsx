import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminFlash } from '@/hooks/use-admin-flash';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface MobileUser { id: string; name: string | null; phone: string; is_active: boolean; created_at: string; complaints_count: number; }
interface Complaint { id: string; status: string; complaint_type: { name: string }; district: { name: string }; created_at: string; }

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    open: 'default', resolved: 'secondary', withdrawn: 'outline', unpublished: 'destructive',
};

export default function ShowMobileUser({ user, complaints }: {
    user: MobileUser;
    complaints: { data: Complaint[]; current_page: number; last_page: number };
}) {
    useAdminFlash();

    return (
        <AppLayout>
            <Head title={`User — ${user.phone}`} />
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild><Link href="/admin/mobile-users"><ArrowLeft className="h-4 w-4" /></Link></Button>
                    <div>
                        <h1 className="text-2xl font-bold">{user.name ?? 'Anonymous'}</h1>
                        <p className="text-muted-foreground">{user.phone}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Badge variant={user.is_active ? 'default' : 'destructive'}>{user.is_active ? 'Active' : 'Suspended'}</Badge>
                        <Button variant="outline" size="sm" onClick={() => router.patch(`/admin/mobile-users/${user.id}/toggle-active`)}>
                            {user.is_active ? 'Suspend' : 'Reactivate'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Total Complaints</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{user.complaints_count}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Joined</CardTitle></CardHeader><CardContent><p className="text-lg">{new Date(user.created_at).toLocaleDateString()}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Email</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Not provided</p></CardContent></Card>
                </div>

                <div>
                    <h2 className="font-semibold mb-3">Recent Complaints</h2>
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    <th className="p-3 text-left font-medium">Type</th>
                                    <th className="p-3 text-left font-medium">District</th>
                                    <th className="p-3 text-left font-medium">Status</th>
                                    <th className="p-3 text-left font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {complaints.data.map((c) => (
                                    <tr key={c.id} className="border-b last:border-0">
                                        <td className="p-3">{c.complaint_type.name}</td>
                                        <td className="p-3">{c.district.name}</td>
                                        <td className="p-3"><Badge variant={STATUS_COLORS[c.status]}>{c.status}</Badge></td>
                                        <td className="p-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                {complaints.data.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No complaints yet</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                        <span>Page {complaints.current_page} of {complaints.last_page}</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={complaints.current_page === 1} onClick={() => router.get(`/admin/mobile-users/${user.id}`, { page: complaints.current_page - 1 })}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" disabled={complaints.current_page === complaints.last_page} onClick={() => router.get(`/admin/mobile-users/${user.id}`, { page: complaints.current_page + 1 })}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
