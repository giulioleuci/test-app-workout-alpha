import { useState } from 'react';

import { motion } from 'framer-motion';
import { Plus, ArrowLeft, Dumbbell, ShieldCheck, CloudOff, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CreateUserDialog } from '@/components/auth/CreateUserDialog';
import { PinEntryDialog } from '@/components/auth/PinEntryDialog';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import type { GlobalUser } from '@/domain/global-entities';

interface Props {
  users: GlobalUser[];
  pinTarget: GlobalUser | null;
  onSelectUser: (user: GlobalUser) => void;
  onPinSuccess: (userId: string) => void;
  onPinCancel: () => void;
  onUserCreated: (userId: string) => void;
  onGoBack?: () => void;
}

export default function UserSelectionPage({
  users, pinTarget, onSelectUser, onPinSuccess, onPinCancel, onUserCreated, onGoBack,
}: Props) {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);

  const AppInfoModal = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
          <Info className="h-5 w-5 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-h4 text-center font-black">
            {t('onboarding.welcome')}
          </DialogTitle>
          <DialogDescription className="text-center">
            Workout Tracker 2
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          <div className="rounded-xl border-2 border-primary/20 bg-muted/30 p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                {t('users.privacyTitle')}
              </h3>
            </div>
            <p className="text-body-sm leading-relaxed text-muted-foreground">
              {t('users.appOfflineInfo')}
            </p>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary/70">
              <CloudOff className="h-3.5 w-3.5" />
              <span>{t('users.noServersBadge')}</span>
            </div>
          </div>

          <div className="space-y-3 px-1">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">
              {t('onboarding.featuresTitle')}
            </p>
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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="absolute right-6 top-6 flex items-center gap-2">
        <AppInfoModal />
        <LanguageSwitcher showLabel={false} />
      </div>

      {onGoBack && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-6 top-6"
          onClick={onGoBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <Card className="overflow-hidden border-none shadow-2xl sm:border">
          <CardHeader className="space-y-2 border-b bg-muted/20 pb-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-h4 font-bold">{t('users.welcome')}</CardTitle>
            <CardDescription className="text-[10px] font-medium uppercase tracking-widest">
              {t('users.selectUser')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col gap-3">
              {users.map((user, i) => (
                <motion.div key={user.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Button
                    variant="outline"
                    className="h-auto w-full justify-start border-2 p-5 text-left hover:bg-accent/50"
                    onClick={() => onSelectUser(user)}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-black text-white shadow-md"
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-bold">{user.name}</span>
                      </div>
                    </div>
                  </Button>
                </motion.div>
              ))}

              {users.length === 0 && (
                <div className="rounded-xl border-2 border-dashed bg-muted/10 p-10 text-center">
                  <p className="text-body-sm mb-4 font-bold text-muted-foreground">
                    {t('users.noUsers')}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground/70">
                    {t('onboarding.step1Subtitle')}
                  </p>
                </div>
              )}
            </div>

            <Button className="h-14 w-full text-lg font-black shadow-lg" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-6 w-6" />
              {t('users.createUser')}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <CreateUserDialog 
        open={createOpen} 
        onOpenChange={setCreateOpen} 
        onUserCreated={(userId) => { 
          onUserCreated(userId); // Refresh list
          setCreateOpen(false); 
        }} 
      />

      {pinTarget && (
        <PinEntryDialog user={pinTarget} open={!!pinTarget} onSuccess={() => onPinSuccess(pinTarget.id)} onCancel={onPinCancel} />
      )}
    </div>
  );
}

