import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AVATAR_COLORS } from '@/domain/global-entities';
import { cn } from '@/lib/utils';
import { hashPin } from '@/services/authService';
import { userService } from '@/services/userService';


const schema = z.object({
  name: z.string().min(1),
  pin: z.string().regex(/^\d{4,6}$/).or(z.literal('')),
  avatarColor: z.string(),
});

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export function CreateUserDialog({ open, onOpenChange, onUserCreated }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', pin: '', avatarColor: AVATAR_COLORS[0] },
  });

  const onSubmit = async (values: Values) => {
    setLoading(true);
    try {
      const pinHash = values.pin ? await hashPin(values.pin) : null;
      await userService.createUser(values.name, pinHash, values.avatarColor);
      onUserCreated();
      form.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="absolute right-4 top-12 z-50">
          <LanguageSwitcher showLabel={false} iconOnly={true} />
        </div>
        <DialogHeader>
          <DialogTitle>{t('users.createUser')}</DialogTitle>
          <DialogDescription>{t('users.createUserDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('users.name')}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="pin" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('users.pinOptional')}</FormLabel>
                <FormControl>
                  <Input {...field} type="password" inputMode="numeric" maxLength={6} placeholder={t('users.pinPlaceholder')} />
                </FormControl>
                <FormDescription>{t('users.pinDescription')}</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="avatarColor" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('users.color')}</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map(color => (
                    <button key={color} type="button"
                      className={cn('w-8 h-8 rounded-full transition-all', field.value === color && 'ring-2 ring-offset-2 ring-primary')}
                      style={{ backgroundColor: color }}
                      onClick={() => field.onChange(color)}
                    />
                  ))}
                </div>
              </FormItem>
            )} />
            <Button type="submit" disabled={loading} className="mt-2">
              {t('actions.create')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
