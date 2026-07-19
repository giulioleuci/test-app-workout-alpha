import { type UseFormReturn, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { EnumCheckboxSelector } from '@/components/form/EnumCheckboxSelector';
import { Equipment } from '@/domain/enums';

interface EquipmentSelectorProps<T extends FieldValues> {
  form: UseFormReturn<T>;
}

export default function EquipmentSelector<T extends FieldValues>({ form }: EquipmentSelectorProps<T>) {
  const { t } = useTranslation();

  return (
    <EnumCheckboxSelector
      form={form}
      name={"equipment" as Path<T>}
      label={t('exercises.fields.equipment')}
      items={Object.values(Equipment)}
      getLabel={(eq) => t(`enums.equipment.${eq}`)}
    />
  );
}
