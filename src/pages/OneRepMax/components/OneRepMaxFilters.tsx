import { Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SortKey = 'az' | 'za' | 'loadDesc' | 'loadAsc';

interface OneRepMaxFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  sortKey: SortKey;
  onSortKeyChange: (v: SortKey) => void;
  filterMethod: string;
  onFilterMethodChange: (v: string) => void;
  showEstimates: boolean;
  onToggleEstimates: () => void;
  estimatesLoading: boolean;
}

export default function OneRepMaxFilters({
  search,
  onSearchChange,
  sortKey,
  onSortKeyChange,
  filterMethod,
  onFilterMethodChange,
  showEstimates,
  onToggleEstimates,
  estimatesLoading,
}: OneRepMaxFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder={t('exercises.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="min-w-36 flex-1"
        />
        <Select value={sortKey} onValueChange={(v) => onSortKeyChange(v as SortKey)}>
          <SelectTrigger className="h-9 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="az">{t('common.sortAZ')}</SelectItem>
            <SelectItem value="za">{t('common.sortZA')}</SelectItem>
            <SelectItem value="loadDesc">{t('common.sortLoadDesc')}</SelectItem>
            <SelectItem value="loadAsc">{t('common.sortLoadAsc')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMethod} onValueChange={onFilterMethodChange}>
          <SelectTrigger className="h-9 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.allMethods')}</SelectItem>
            <SelectItem value="direct">{t('oneRepMax.direct')}</SelectItem>
            <SelectItem value="indirect">{t('oneRepMax.indirect')}</SelectItem>
            {showEstimates && <SelectItem value="estimated">{t('oneRepMax.estimated')}</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant={showEstimates ? 'secondary' : 'outline'}
        size="sm"
        className="w-full"
        onClick={onToggleEstimates}
        disabled={estimatesLoading}
      >
        <Calculator className="mr-2 h-4 w-4" />
        {estimatesLoading ? t('common.loading') : showEstimates ? t('oneRepMax.hideEstimates') : t('oneRepMax.showEstimates')}
      </Button>
    </div>
  );
}
