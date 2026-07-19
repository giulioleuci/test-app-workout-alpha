import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

const PAGE_SIZE = 5;

interface ListPaginationProps {
  total: number;
  page: number;
  onPageChange: (page: number) => void;
}

export function paginate<T>(items: T[], page: number): T[] {
  const start = (page - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

export function totalPages(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

export default function ListPagination({
  total, page, onPageChange }: ListPaginationProps) {
  const { t } = useTranslation();
  const pages = totalPages(total);
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        className="text-body-sm h-8"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="mr-0.5 h-3.5 w-3.5" />
        {t('common.prev')}
      </Button>
      <span className="text-body-sm text-muted-foreground">
        {t('common.page')} {page} {t('common.of')} {pages}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="text-body-sm h-8"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        {t('common.next')}
        <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
