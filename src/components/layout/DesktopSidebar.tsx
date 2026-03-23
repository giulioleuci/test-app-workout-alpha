import { LucideIcon } from 'lucide-react';

import { NavLink } from '@/components/NavLink';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface DesktopSidebarProps {
  navItems: NavItem[];
}

export default function DesktopSidebar({ navItems }: DesktopSidebarProps) {
  return (
    <aside className="hidden w-56 flex-col gap-1 border-r bg-sidebar p-3 md:flex">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
        >
          <item.icon className="h-4.5 w-4.5" />
          {item.label}
        </NavLink>
      ))}
    </aside>
  );
}
