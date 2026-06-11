import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Users, Zap, MapPin, TrendingUp, EyeOff, Calendar } from 'lucide-react';

interface Stats {
    total_complaints: number;
    open_complaints: number;
    resolved_complaints: number;
    unpublished_complaints: number;
    total_chittars: number;
    total_users: number;
    complaints_today: number;
    complaints_this_week: number;
    complaints_this_month: number;
    most_chittared_politician: { name: string; count: number; constituency: string } | null;
    most_active_district: { name: string; count: number } | null;
}

export default function Dashboard({ stats }: { stats: Stats }) {
    return (
        <AppLayout>
            <Head title="Dashboard" />
            <div className="flex flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">Platform overview and activity summary</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard icon={AlertCircle} title="Total Complaints" value={stats.total_complaints} color="text-blue-500" />
                    <StatCard icon={TrendingUp} title="Open" value={stats.open_complaints} color="text-yellow-500" />
                    <StatCard icon={CheckCircle} title="Resolved" value={stats.resolved_complaints} color="text-green-500" />
                    <StatCard icon={EyeOff} title="Unpublished" value={stats.unpublished_complaints} color="text-gray-500" />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard icon={Zap} title="Total Chittars Sent" value={stats.total_chittars} color="text-red-500" />
                    <StatCard icon={Users} title="Registered Users" value={stats.total_users} color="text-purple-500" />
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Complaints Timeline</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Today</span><span className="font-semibold">{stats.complaints_today}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">This Week</span><span className="font-semibold">{stats.complaints_this_week}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">This Month</span><span className="font-semibold">{stats.complaints_this_month}</span></div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Most Chittared Politician This Week</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stats.most_chittared_politician ? (
                                <div>
                                    <p className="text-lg font-bold">{stats.most_chittared_politician.name}</p>
                                    <p className="text-muted-foreground text-sm">{stats.most_chittared_politician.constituency} · {stats.most_chittared_politician.count} chittars</p>
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">No data yet</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Most Active District This Week</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stats.most_active_district ? (
                                <div>
                                    <p className="text-lg font-bold">{stats.most_active_district.name}</p>
                                    <p className="text-muted-foreground text-sm">{stats.most_active_district.count} complaints</p>
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">No data yet</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

function StatCard({ icon: Icon, title, value, color }: { icon: React.ElementType; title: string; value: number; color: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            </CardContent>
        </Card>
    );
}
