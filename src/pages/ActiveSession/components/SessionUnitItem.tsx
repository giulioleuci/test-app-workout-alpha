import { useTranslation } from 'react-i18next';

import type { DisplayUnit } from '@/domain/activeSessionTypes';
import { ExerciseGroupType } from '@/domain/enums';

import ExerciseGroupRenderer from './ExerciseGroupRenderer';


export interface SessionUnitItemProps {
  u: DisplayUnit;
  idx: number;
  list: DisplayUnit[];
}

export default function SessionUnitItem({
  u,
  idx,
  list
}: SessionUnitItemProps) {
  const { t } = useTranslation();
  const isFirstOfGroupSequence = idx === 0 || u.group.group.id !== list[idx - 1].group.group.id;
  const isGroupUnit = u.type === 'group';

  // The header is shown for group units, OR for the first item of a sequential group rendered as items
  const showHeader = isGroupUnit || isFirstOfGroupSequence;

  return (
    <div className="space-y-3">
      {showHeader && u.group.group.groupType !== ExerciseGroupType.Standard && (
        <div className="mx-1 mb-2 mt-6 flex items-center justify-between text-muted-foreground">
          <div className="text-sm font-medium uppercase tracking-wider">
            {t(`enums.exerciseGroupType.${u.group.group.groupType}`)}
          </div>
        </div>
      )}

      <div className="relative">
        {u.type === 'group' ? (
          <ExerciseGroupRenderer
            lg={u.group}
            gi={u.originalGroupIndex}
          />
        ) : (
          <ExerciseGroupRenderer
            lg={u.group}
            gi={u.originalGroupIndex}
            liItems={u.items}
            itemIndices={u.originalItemIndices}
          />
        )}
      </div>
    </div>
  );
}
