import { type UseFormReturn, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { EnumCheckboxSelector } from '@/components/form/EnumCheckboxSelector';
import { Muscle } from '@/domain/enums';

interface MuscleSelectorProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
}

export default function MuscleSelector<T extends FieldValues>({ form, name, label }: MuscleSelectorProps<T>) {
  const { t } = useTranslation();

  return (
    <EnumCheckboxSelector
      form={form}
      name={name}
      label={label}
      items={Object.values(Muscle)}
      getLabel={(m) => t(`enums.muscle.${m}`)}
    />
  );
}
