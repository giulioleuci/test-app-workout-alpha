import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ExercisePicker from '@/components/exercises/ExercisePicker';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import type { Exercise } from '@/domain/entities';

interface VariantsSectionProps {
  variantIds: string[];
  selectedVariants: Exercise[];
  availableForVariants: Exercise[];
  onAddVariant: (id: string) => void;
  onRemoveVariant: (id: string) => void;
}

export default function VariantsSection({
  variantIds,
  selectedVariants,
  availableForVariants,
  onAddVariant,
  onRemoveVariant,
}: VariantsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Label>{t('exercises.variants.title')}</Label>
      {selectedVariants.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedVariants.map(v => (
            <Badge key={v.id} variant="secondary" className="flex items-center gap-1 pr-1">
              {v.name}
              <button
                type="button"
                onClick={() => onRemoveVariant(v.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <ExercisePicker
        exercises={availableForVariants}
        onSelect={onAddVariant}
        placeholder={t('exercises.variants.add')}
      />
      {variantIds.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('exercises.variants.none')}</p>
      )}
    </div>
  );
}
