import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { revenueCatKeys } from '../config/env';

/**
 * The full-class purchase, through RevenueCat and the App Store or Google Play.
 *
 * Price: the only price the app may show is `priceString` from the store. Never
 * write a dollar amount into the app; App Store Connect sets the price, and a
 * literal would be wrong in other countries and wrong after any price change
 * (NameRoots learned this the hard way).
 *
 * The code never names the product. It buys the current offering's first
 * package, so changing the product or price is a RevenueCat or App Store
 * Connect change, not a new build.
 *
 * RevenueCat setup (dashboard):
 *   - Entitlement "full_class"
 *   - Product "babyready_full_class" (non-consumable, $19.99 in App Store
 *     Connect) attached to that entitlement
 *   - The default offering's first package points at that product
 */

export const ENTITLEMENT_ID = 'full_class';

export type PurchaseResult = 'purchased' | 'cancelled' | 'failed';

let configured = false;

function apiKey(): string {
  if (Platform.OS === 'ios') return revenueCatKeys.ios;
  if (Platform.OS === 'android') return revenueCatKeys.android;
  return '';
}

/** True when this device can buy: a phone with a RevenueCat key. Never on the web. */
export function purchasesAvailable(): boolean {
  return Boolean(apiKey());
}

function ensureConfigured(): boolean {
  if (configured) return true;
  const key = apiKey();
  if (!key) return false;
  // Anonymous RevenueCat user: the purchase belongs to the Apple or Google
  // account, so Restore Purchase brings it back after a reinstall or after
  // Delete my data.
  Purchases.configure({ apiKey: key });
  configured = true;
  return true;
}

function hasFullClass(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

async function currentPackage(): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages?.[0] ?? null;
}

/** Whether this learner owns the full class. False when it can't be checked. */
export async function checkUnlocked(): Promise<boolean> {
  if (!ensureConfigured()) return false;
  try {
    return hasFullClass(await Purchases.getCustomerInfo());
  } catch {
    return false;
  }
}

/** The store's own localized price, like "$19.99" or "19,99 €". Null if unknown: show no price rather than guess. */
export async function loadPriceString(): Promise<string | null> {
  if (!ensureConfigured()) return null;
  try {
    return (await currentPackage())?.product.priceString ?? null;
  } catch {
    return null;
  }
}

export async function buyFullClass(): Promise<PurchaseResult> {
  if (!ensureConfigured()) return 'failed';
  try {
    const pkg = await currentPackage();
    if (!pkg) return 'failed';
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return hasFullClass(customerInfo) ? 'purchased' : 'failed';
  } catch (error) {
    if ((error as { userCancelled?: boolean } | null)?.userCancelled) return 'cancelled';
    return 'failed';
  }
}

/** Restores an earlier purchase from the store. Resolves to whether the full class is now unlocked. */
export async function restoreFullClass(): Promise<boolean> {
  if (!ensureConfigured()) return false;
  try {
    return hasFullClass(await Purchases.restorePurchases());
  } catch {
    return false;
  }
}
