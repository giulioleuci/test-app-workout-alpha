import { useState } from 'react';

import { motion } from 'framer-motion';
import { Plus, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CreateUserDialog } from '@/components/auth/CreateUserDialog';
import { PinEntryDialog } from '@/components/auth/PinEntryDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <h1 className="text-h2 mb-2 text-center font-bold">
          {t('users.welcome')}
        </h1>
        <p className="text-body-sm mb-8 text-center text-muted-foreground">
          {t('users.selectUser')}
        </p>

        <div className="mb-8 rounded-md bg-secondary/50 p-4 text-center text-sm text-muted-foreground">
          {t('users.appOfflineInfo', 'Questa app funziona completamente offline. Tutti i tuoi dati sono salvati esclusivamente sul tuo dispositivo.')}
        </div>

        <div className="flex flex-col gap-3">
          {users.map((user, i) => (
            <motion.div key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="cursor-pointer transition-colors hover:bg-accent/50" onClick={() => onSelectUser(user)}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white" style={{ backgroundColor: user.avatarColor }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-body font-medium">{user.name}</span>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {users.length === 0 && (
            <p className="text-body-sm p-4 text-center text-muted-foreground">
              {t('users.noUsers')}
            </p>
          )}
        </div>

        <Button className="mt-6 w-full" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('users.createUser')}
        </Button>
      </motion.div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onUserCreated={() => { onUserCreated(); setCreateOpen(false); }} />

      {pinTarget && (
        <PinEntryDialog user={pinTarget} open={!!pinTarget} onSuccess={() => onPinSuccess(pinTarget.id)} onCancel={onPinCancel} />
      )}
    </div>
  );
}
