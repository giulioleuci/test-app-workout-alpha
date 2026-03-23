import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { UserProfile } from '@/domain/entities';

interface ProfileInfoSectionProps {
  userProfile: UserProfile;
  onUpdate: (data: { name: string; gender: 'male' | 'female' | 'undisclosed' }) => void;
}

export default function ProfileInfoSection({ userProfile, onUpdate }: ProfileInfoSectionProps) {
  const { t } = useTranslation();

  const userProfileSchema = useMemo(() => z.object({
    name: z.string().min(1, t('onboarding.nameRequired') || "Il nome è obbligatorio"),
    gender: z.enum(['male', 'female', 'undisclosed']),
  }), [t]);

  type UserProfileFormValues = z.infer<typeof userProfileSchema>;

  const profileForm = useForm<UserProfileFormValues>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      name: userProfile.name,
      gender: userProfile.gender,
    }
  });

  useEffect(() => {
    profileForm.reset({
      name: userProfile.name,
      gender: userProfile.gender
    });
  }, [userProfile, profileForm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h4 flex items-center gap-2">
          <User className="h-5 w-5" />
          {t('profile.nameAndGender')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...profileForm}>
          <form className="grid grid-cols-2 gap-3">
            <FormField
              control={profileForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.name')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        const val = e.target.value;
                        const result = userProfileSchema.shape.name.safeParse(val);
                        if (result.success) {
                           onUpdate({ ...profileForm.getValues(), name: val });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={profileForm.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.gender')}</FormLabel>
                  <Select onValueChange={(val) => {
                      field.onChange(val);
                      onUpdate({ ...profileForm.getValues(), gender: val as any });
                  }} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">{t('profile.genderOptions.male')}</SelectItem>
                      <SelectItem value="female">{t('profile.genderOptions.female')}</SelectItem>
                      <SelectItem value="undisclosed">{t('profile.genderOptions.undisclosed')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
