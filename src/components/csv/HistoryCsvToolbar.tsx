import { useHistoryCsvTransferViewModel } from '@/hooks/view-models/useCsvTransferViewModel';

import { CsvTransferToolbar } from './CsvTransferToolbar';

interface Props {
  onImported?: () => void;
}

export function HistoryCsvToolbar({ onImported }: Props) {
  const vm = useHistoryCsvTransferViewModel(onImported);
  return <CsvTransferToolbar vm={vm} />;
}
