import { Suspense, useMemo } from 'react';

import { Dumbbell, LayoutDashboard, BookOpen, BarChart3, Settings, History, HardDrive, Target, UserCircle, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, ScrollRestoration } from 'react-router-dom';

import RestTimer from '@/components/session/RestTimer';
import { ListPageSkeleton } from '@/components/ui/page-skeleton';
import { useUserRegulation } from '@/hooks/queries/dashboardQueries';
import { useActiveSessionStore } from '@/stores/activeSessionStore';

import AppHeader from './AppHeader';
import { PageBackground } from '../backgrounds/PageBackground';
import DesktopSidebar from './DesktopSidebar';
import MobileBottomNav from './MobileBottomNav';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  hideInSimpleMode?: boolean;
}

function useCurrentPage(navItems: NavItem[]) {
  const location = useLocation();
  const path = location.pathname;
  const exact = navItems.find(i => i.to === path);
  if (exact) return exact;
  const prefix = navItems
    .filter(i => i.to !== '/' && path.startsWith(i.to))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return prefix ?? null;
}

export function AppLayout() {
  const { t } = useTranslation();
  const baseNavItems = useMemo(() => [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/workouts', icon: Dumbbell, label: t('nav.workouts') },
    { to: '/exercises', icon: BookOpen, label: t('nav.exercises') },
    { to: '/history', icon: History, label: t('nav.history') },
    { to: '/analytics', icon: BarChart3, label: t('nav.analytics') },
    { to: '/1rm', icon: Target, label: t('oneRepMax.navLabel'), hideInSimpleMode: true },
    { to: '/profile', icon: UserCircle, label: t('profile.title') },
    { to: '/backup', icon: HardDrive, label: t('nav.backup') },
    { to: '/settings', icon: Settings, label: t('nav.settings') },
  ], [t]);

  const bottomNavItems = useMemo(() => [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/workouts', icon: Dumbbell, label: t('nav.workouts') },
    { to: '/history', icon: History, label: t('nav.history') },
  ], [t]);

  const location = useLocation();
  const activeSessionId = useActiveSessionStore((s) => s.activeSessionId);

  const { data: userRegulation } = useUserRegulation();
  const simpleMode = userRegulation?.simpleMode ?? false;

  const navItems = useMemo(() => baseNavItems.filter(i => !simpleMode || !i.hideInSimpleMode), [baseNavItems, simpleMode]);
  const currentPage = useCurrentPage(navItems);

  const moreItems = useMemo(() => {
    const bottomSet = new Set(['/', '/workouts', '/history']);
    return navItems.filter(i => !bottomSet.has(i.to));
  }, [navItems]);

  const PageIcon = currentPage?.icon ?? Dumbbell;
  const pageLabel = currentPage?.label ?? t('appName');

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Background Layer: isolato e fisso dietro tutto il contenuto */}
      <PageBackground />

      {/* Content Layer: z-index superiore per garantire l'interattività */}
      <div className="relative z-10 flex flex-1 flex-col">
        <AppHeader
          pageLabel={pageLabel}
          PageIcon={PageIcon}
          activeSessionId={activeSessionId}
        />

        <div className="flex flex-1">
          <DesktopSidebar navItems={navItems} />

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="container max-w-5xl px-4 pb-20 pt-4">
              <Suspense fallback={
                <div className="py-8">
                  <ListPageSkeleton />
                </div>
              }>
                <Outlet />
              </Suspense>
            </div>
          </main>

          <ScrollRestoration />
        </div>

        <RestTimer />

        <MobileBottomNav
          bottomNavItems={bottomNavItems}
          moreItems={moreItems}
        />
      </div>
    </div>
  );
}
