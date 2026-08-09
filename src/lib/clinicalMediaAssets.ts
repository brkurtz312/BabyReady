import type { ImageSourcePropType } from 'react-native';

const bundledClinicalMedia: Record<string, ImageSourcePropType> = {
  'early-pregnancy-care-timeline': require('../../assets/clinical-media/early-pregnancy-care-timeline.png'),
  'folic-acid-early-pregnancy': require('../../assets/clinical-media/folic-acid-early-pregnancy.png'),
  'nausea-support-ideas': require('../../assets/clinical-media/nausea-support-ideas.png'),
};

export const clinicalMediaAssetKeys = Object.keys(bundledClinicalMedia);

export function getBundledClinicalMediaAsset(
  assetKey: string,
): ImageSourcePropType | null {
  return bundledClinicalMedia[assetKey] ?? null;
}
