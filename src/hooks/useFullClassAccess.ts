import { useCallback, useEffect, useState } from 'react';

import { paywallEnabled } from '../config/env';
import { isLessonLocked } from '../lib/access';
import {
  buyFullClass,
  checkUnlocked,
  loadPriceString,
  purchasesAvailable,
  restoreFullClass,
  type PurchaseResult,
} from '../services/purchaseService';

/**
 * Whether this learner has the full class, and how to buy or restore it.
 * With EXPO_PUBLIC_ENABLE_PAYWALL off, nothing is ever locked and the store is
 * never contacted.
 */
export function useFullClassAccess() {
  const canBuy = paywallEnabled && purchasesAvailable();
  const [unlocked, setUnlocked] = useState(false);
  const [priceString, setPriceString] = useState<string | null>(null);

  useEffect(() => {
    if (!canBuy) return;
    let active = true;
    void checkUnlocked().then((owned) => active && owned && setUnlocked(true));
    void loadPriceString().then((price) => active && setPriceString(price));
    return () => {
      active = false;
    };
  }, [canBuy]);

  const isLocked = useCallback(
    (courseId: string, lessonId: string) => isLessonLocked(courseId, lessonId, { paywallEnabled, unlocked }),
    [unlocked],
  );

  const buy = useCallback(async (): Promise<PurchaseResult> => {
    const result = await buyFullClass();
    if (result === 'purchased') setUnlocked(true);
    return result;
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    const owned = await restoreFullClass();
    if (owned) setUnlocked(true);
    return owned;
  }, []);

  return { canBuy, unlocked, priceString, isLocked, buy, restore };
}

export type FullClassAccess = ReturnType<typeof useFullClassAccess>;
