import { useWindowDimensions } from 'react-native';

/**
 * Keeps the clinician UI phone-first in narrow widths, including iPad Split
 * View, while enabling the persistent library/detail workspace on a full iPad.
 */
export const CLINICIAN_WORKSPACE_MIN_WIDTH = 760;

export function useClinicianWorkspace(): boolean {
  const { width } = useWindowDimensions();
  return width >= CLINICIAN_WORKSPACE_MIN_WIDTH;
}
