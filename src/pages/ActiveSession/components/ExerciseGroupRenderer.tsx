import { getGroupBehavior } from '@/domain/groupBehavior';

import ClusterGroupRenderer from './ClusterGroupRenderer';
import InterleavedGroupRenderer from './InterleavedGroupRenderer';
import SequentialGroupRenderer from './SequentialGroupRenderer';

import type { ExerciseGroupRendererProps } from './ExerciseGroupRenderer.types';

export default function ExerciseGroupRenderer(props: ExerciseGroupRendererProps) {
  const { lg } = props;
  const behavior = getGroupBehavior(lg.group.groupType);
  const isInterleaved = behavior.exerciseTraversal === 'interleaved' && lg.items.length > 1;

  if (behavior.setBlockTraversal === 'cluster') {
    return <ClusterGroupRenderer {...props} />;
  }

  if (isInterleaved) {
    return <InterleavedGroupRenderer {...props} />;
  }

  return <SequentialGroupRenderer {...props} />;
}
