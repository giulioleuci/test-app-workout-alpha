import { Suspense, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, LayoutDashboard, BookOpen, BarChart3, Settings, History, HardDrive, Target, UserCircle, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';

import RestTimer from '@/components/session/RestTimer';
import { ListPageSkeleton } from '@/components/ui/page-skeleton';
import { useUserRegulation } from '@/hooks/queries/dashboardQueries';
import { useActiveSessionStore } from '@/stores/activeSessionStore';

import AppHeader from './AppHeader';
import DesktopSidebar from './DesktopSidebar';
import MobileBottomNav from './MobileBottomNav';
import { PageBackground } from '../backgrounds/PageBackground';

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
  const location = useLocation();
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

  const activeSessionId = useActiveSessionStore((s) => s.activeSessionId);

  const { data: userRegulation } = useUserRegulation();
  const simpleMode = userRegulation?.simpleMode ?? false;

  const navItems = useMemo(() => baseNavItems.filter(i => !simpleMode || !i.hideInSimpleMode), [baseNavItems, simpleMode]);
  const currentPage = useCurrentPage(navItems);

  const moreItems = useMemo(() => {
    const bottomSet = new Set(['/', '/workouts', '/history']);
    return navItems.filter(i => !bottomSet.has(i.to));
  }, [navItems]);

  const pageLabel = currentPage?.label ?? t('appName');

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Background Layer: isolato e fisso dietro tutto il contenuto */}
      <PageBackground />

      {/* Content Layer: z-index superiore per garantire l'interattività */}
      <div className="relative z-10 flex flex-1 flex-col">
        <AppHeader
          pageLabel={pageLabel}
          activeSessionId={activeSessionId}
        />

        <div className="flex flex-1">
          <DesktopSidebar navItems={navItems} />

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="container max-w-5xl px-4 pb-20 pt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <Suspense fallback={<ListPageSkeleton />}>
                    <Outlet />
                  </Suspense>
                </motion.div>
              </AnimatePresence>
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
