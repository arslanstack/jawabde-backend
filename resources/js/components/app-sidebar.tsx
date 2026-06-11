import { Link } from '@inertiajs/react';
import {
    LayoutGrid,
    Map,
    Building2,
    Users,
    AlertCircle,
    ListChecks,
    Tag,
    MapPin,
    Vote,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';

const navItems = [
    { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutGrid },
];

const dataItems = [
    { title: 'Provinces',          href: '/admin/provinces',          icon: Map },
    { title: 'Districts',          href: '/admin/districts',           icon: Building2 },
    { title: 'Constituency Types', href: '/admin/constituency-types',  icon: Tag },
    { title: 'Constituencies',     href: '/admin/constituencies',      icon: MapPin },
    { title: 'Politicians',        href: '/admin/politicians',         icon: Vote },
    { title: 'Terms',              href: '/admin/terms',               icon: ListChecks },
];

const activityItems = [
    { title: 'Complaints',   href: '/admin/complaints',   icon: AlertCircle },
    { title: 'Mobile Users', href: '/admin/mobile-users', icon: Users },
];

export function AppSidebar() {
    const current = typeof window !== 'undefined' ? window.location.pathname : '';
    const isActive = (href: string) => current.startsWith(href);

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/admin/dashboard">
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton asChild isActive={isActive(item.href)}>
                                        <Link href={item.href}><item.icon /><span>{item.title}</span></Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                <SidebarGroup>
                    <SidebarGroupLabel>Data Management</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {dataItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton asChild isActive={isActive(item.href)}>
                                        <Link href={item.href}><item.icon /><span>{item.title}</span></Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                <SidebarGroup>
                    <SidebarGroupLabel>Activity</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {activityItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton asChild isActive={isActive(item.href)}>
                                        <Link href={item.href}><item.icon /><span>{item.title}</span></Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

