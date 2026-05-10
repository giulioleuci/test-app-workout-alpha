import { useState, useEffect } from 'react';

import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { NavLink } from '@/components/NavLink';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface MobileBottomNavProps {
  bottomNavItems: NavItem[];
  moreItems: NavItem[];
}

export default function MobileBottomNav({ bottomNavItems, moreItems }: MobileBottomNavProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  useEffect(() => {
    setMoreSheetOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav 
        className="safe-area-bottom fixed bottom-0 left-0 right-0 z-overlay border-t bg-card/90 backdrop-blur-lg duration-200 md:hidden"
        style={{ bottom: 'var(--keyboard-offset, 0px)', transitionProperty: 'bottom' }}
      >
        <div className="flex items-center justify-around" style={{ height: '3.25rem' }}>
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground transition-colors"
              activeClassName="text-primary font-semibold"
            >
              <item.icon className="h-4.5 w-4.5" style={{ height: '1.125rem', width: '1.125rem' }} />
              <span className="text-[10px] leading-none">{item.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreSheetOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full text-muted-foreground transition-colors gap-0.5",
              moreItems.some((i) => location.pathname === i.to || (i.to !== '/' && location.pathname.startsWith(i.to))) && "text-primary font-semibold"
            )}
          >
            <MoreHorizontal className="h-4.5 w-4.5" style={{ height: '1.125rem', width: '1.125rem' }} />
            <span className="text-[10px] leading-none">{t('nav.more')}</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader>
            <SheetTitle>{t('nav.more')}</SheetTitle>
          </SheetHeader>
          <nav className="grid grid-cols-3 gap-3 px-2 pt-4">
            {moreItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-center text-[14px] text-muted-foreground transition-colors hover:bg-accent"
                activeClassName="bg-accent text-accent-foreground font-semibold"
                onClick={() => setMoreSheetOpen(false)}
              >
                <item.icon className="h-6 w-6" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
