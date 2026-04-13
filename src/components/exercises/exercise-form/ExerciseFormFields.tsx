import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MovementPattern, CounterType, ExerciseType } from '@/domain/enums';


import EquipmentSelector from '../components/EquipmentSelector';
import MuscleSelector from '../components/MuscleSelector';

import type { ExerciseFormValues } from '../ExerciseForm';

const MAX_EXERCISE_NAME_LENGTH = 100;

interface ExerciseFormFieldsProps {
  form: UseFormReturn<ExerciseFormValues>;
}

export default function ExerciseFormFields({ form }: ExerciseFormFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('exercises.fields.name')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('exercises.namePlaceholder')} maxLength={MAX_EXERCISE_NAME_LENGTH} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('exercises.fields.type')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(ExerciseType).map((et) => (
                      <SelectItem key={et} value={et}>{t(`enums.exerciseType.${et}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <MuscleSelector
          form={form}
          name="primaryMuscles"
          label={t('exercises.fields.primaryMuscles')}
        />

        <MuscleSelector
          form={form}
          name="secondaryMuscles"
          label={t('exercises.fields.secondaryMuscles')}
        />

        <EquipmentSelector form={form} />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="movementPattern"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('exercises.fields.movementPattern')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(MovementPattern).map((m) => (
                      <SelectItem key={m} value={m}>{t(`enums.movementPattern.${m}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="counterType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('exercises.fields.counterType')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(CounterType).map((c) => (
                      <SelectItem key={c} value={c}>{t(`enums.counterType.${c}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="defaultLoadUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('exercises.fields.defaultLoadUnit')}</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('exercises.fields.description')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('exercises.descriptionPlaceholder')}
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
        />

        <FormField
            control={form.control}
            name="keyPoints"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('exercises.fields.keyPoints')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('exercises.keyPointsPlaceholder')}
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
        />
    </>
  );
}
