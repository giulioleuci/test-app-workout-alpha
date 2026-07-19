import { CloudOff, Dumbbell, Info, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type AppInfoModalProps = {
  triggerClassName: string;
  iconClassName: string;
  privacyTitleKey: string;
  offlineInfoKey: string;
};

export function AppInfoModal({ triggerClassName, iconClassName, privacyTitleKey, offlineInfoKey }: AppInfoModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className={triggerClassName}>
          <Info className={iconClassName} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md overflow-y-auto sm:w-full" style={{ maxHeight: '90vh', width: '95vw' }}>
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-h4 text-center font-black">{t('onboarding.welcome')}</DialogTitle>
          <DialogDescription className="text-center">{t('common.appName', 'Delta Workout')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          <div className="rounded-xl border-2 border-primary/20 bg-muted/30 p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold tracking-tight text-foreground">{t(privacyTitleKey)}</h3>
            </div>
            <p className="text-body-sm leading-relaxed text-muted-foreground">{t(offlineInfoKey)}</p>
            <div className="mt-3 flex items-center gap-2 font-bold uppercase tracking-wider text-primary/70" style={{ fontSize: '10px' }}>
              <CloudOff className="h-3.5 w-3.5" />
              <span>{t('users.noServersBadge')}</span>
            </div>
          </div>
          <div className="space-y-3 px-1">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">{t('onboarding.featuresTitle')}</p>
            <ul className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <li key={i} className="text-body-sm flex items-start gap-3 text-muted-foreground">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/40" />
                  <span>{t(`onboarding.feature${i}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
