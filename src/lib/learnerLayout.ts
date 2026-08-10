import { useWindowDimensions } from 'react-native';

export const LEARNER_TABLET_MIN_WIDTH = 700;

export type LearnerLayout = {
  isTabletLayout: boolean;
  width: number;
};

export function useLearnerLayout(): LearnerLayout {
  const { width } = useWindowDimensions();

  return {
    isTabletLayout: width >= LEARNER_TABLET_MIN_WIDTH,
    width,
  };
}
