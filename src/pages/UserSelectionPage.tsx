import { useState } from 'react';

import { motion } from 'framer-motion';
import { Plus, ArrowLeft, Dumbbell, ShieldCheck, CloudOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CreateUserDialog } from '@/components/auth/CreateUserDialog';
import { PinEntryDialog } from '@/components/auth/PinEntryDialog';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { GlobalUser } from '@/domain/global-entities';

interface Props {
  users: GlobalUser[];
  pinTarget: GlobalUser | null;
  onSelectUser: (user: GlobalUser) => void;
  onPinSuccess: (userId: string) => void;
  onPinCancel: () => void;
  onUserCreated: () => void;
  onGoBack?: () => void;
}

export default function UserSelectionPage({
  users, pinTarget, onSelectUser, onPinSuccess, onPinCancel, onUserCreated, onGoBack,
}: Props) {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="absolute right-6 top-6">
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
        <Card className="border-none shadow-2xl sm:border overflow-hidden">
          <CardHeader className="space-y-2 pb-4 text-center border-b bg-muted/20">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-h4 font-bold">{t('users.welcome')}</CardTitle>
            <CardDescription className="font-medium uppercase tracking-widest text-[10px]">
              {t('users.selectUser')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col gap-3">
              {users.map((user, i) => (
                <motion.div key={user.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Button
                    variant="outline"
                    className="h-auto w-full justify-start p-5 text-left hover:bg-accent/50 border-2"
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
                <div className="rounded-xl border-2 border-dashed p-10 text-center">
                  <p className="text-body-sm font-medium text-muted-foreground">
                    {t('users.noUsers')}
                  </p>
                </div>
              )}
            </div>

            <Button className="w-full h-12 text-base font-bold shadow-lg" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-5 w-5" />
              {t('users.createUser')}
            </Button>
          </CardContent>

          {/* INFORMATION FOOTER */}
          <div className="px-6 py-6 bg-muted/30 border-t space-y-6">
            <div className="rounded-xl border-2 border-primary/20 bg-background p-4 transition-all shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold tracking-tight text-foreground">
                  {t('users.privacyTitle')}
                </h3>
              </div>
              <p className="text-body-sm text-muted-foreground leading-relaxed">
                {t('users.appOfflineInfo')}
              </p>
              <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-primary/70 uppercase tracking-wider">
                <CloudOff className="h-3.5 w-3.5" />
                <span>{t('users.noServersBadge')}</span>
              </div>
            </div>

            <div className="space-y-3 px-1">
              <p className="text-xs font-bold text-foreground uppercase tracking-widest">
                {t('onboarding.featuresTitle')}
              </p>
              <ul className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <li key={i} className="flex items-start gap-2 text-body-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                    <span>{t(`onboarding.feature${i}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onUserCreated={() => { onUserCreated(); setCreateOpen(false); }} />

      {pinTarget && (
        <PinEntryDialog user={pinTarget} open={!!pinTarget} onSuccess={() => onPinSuccess(pinTarget.id)} onCancel={onPinCancel} />
      )}
    </div>
  );
}
