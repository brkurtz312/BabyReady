import * as SecureStore from 'expo-secure-store';

import type { CareTeamContacts } from '../models/course';

const CONTACTS_KEY = 'babyready.care-team-contacts.v1';

const emptyContacts = (): CareTeamContacts => ({
  updatedAt: new Date(0).toISOString(),
});

export async function loadCareTeamContacts(): Promise<CareTeamContacts> {
  const available = await SecureStore.isAvailableAsync();
  if (!available) {
    return emptyContacts();
  }

  const stored = await SecureStore.getItemAsync(CONTACTS_KEY);
  if (!stored) {
    return emptyContacts();
  }

  try {
    return JSON.parse(stored) as CareTeamContacts;
  } catch {
    await SecureStore.deleteItemAsync(CONTACTS_KEY);
    return emptyContacts();
  }
}

export async function saveCareTeamContacts(
  contacts: Omit<CareTeamContacts, 'updatedAt'>,
): Promise<CareTeamContacts> {
  const value: CareTeamContacts = {
    ...contacts,
    updatedAt: new Date().toISOString(),
  };
  const available = await SecureStore.isAvailableAsync();

  if (!available) {
    throw new Error('Secure local storage is not available on this device.');
  }

  await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(value));
  return value;
}

export async function clearCareTeamContacts(): Promise<void> {
  const available = await SecureStore.isAvailableAsync();
  if (available) {
    await SecureStore.deleteItemAsync(CONTACTS_KEY);
  }
}
