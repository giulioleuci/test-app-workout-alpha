import { useExerciseCsvTransferViewModel } from '@/hooks/view-models/useCsvTransferViewModel';

import { CsvTransferToolbar } from './CsvTransferToolbar';

interface Props {
  onImported?: () => void;
}

export function ExerciseCsvToolbar({ onImported }: Props) {
  const vm = useExerciseCsvTransferViewModel(onImported);
  return <CsvTransferToolbar vm={vm} />;
}
