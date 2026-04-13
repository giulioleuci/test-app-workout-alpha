import { useState } from 'react';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { GlobalUser } from '@/domain/global-entities';
import { verifyPin } from '@/services/authService';

interface Props {
  user: GlobalUser;
  open: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PinEntryDialog({ user, open, onSuccess, onCancel }: Props) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(false);
    try {
      if (!user.pinHash) {
        onSuccess();
        return;
      }
      const valid = await verifyPin(pin, user.pinHash);
      if (valid) {
        onSuccess();
      } else {
        setError(true);
        setPin('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full font-bold text-white" style={{ backgroundColor: user.avatarColor }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              {user.name}
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 pt-4">
          <label className="text-body-sm text-muted-foreground">{t('users.enterPin')}</label>
          <input
            type="password" inputMode="numeric" maxLength={6} value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && pin.length >= 4) void handleSubmit(); }}
            className="w-40 rounded-lg border bg-background p-3 text-center text-2xl"
            style={{ letterSpacing: '0.5em' }}
          />
          {error && <p className="text-body-sm text-destructive">{t('users.wrongPin')}</p>}
          <div className="flex w-full gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel}>{t('actions.cancel')}</Button>
            <Button className="flex-1" disabled={pin.length < 4 || loading} onClick={handleSubmit}>{t('actions.confirm')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
