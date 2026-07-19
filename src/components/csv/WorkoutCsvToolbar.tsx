import { useWorkoutCsvTransferViewModel } from '@/hooks/view-models/useCsvTransferViewModel';

import { CsvTransferToolbar } from './CsvTransferToolbar';

interface Props {
  onImported?: () => void;
}

export function WorkoutCsvToolbar({ onImported }: Props) {
  const vm = useWorkoutCsvTransferViewModel(onImported);
  return <CsvTransferToolbar vm={vm} />;
}
