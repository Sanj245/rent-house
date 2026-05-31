import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'houses';

/**
 * Subscribe to real-time updates for a house.
 * Returns an unsubscribe function.
 */
export function subscribeToHouse(houseCode, callback) {
  const ref = doc(db, COLLECTION, houseCode.toUpperCase().trim());
  return onSnapshot(
    ref,
    { includeMetadataChanges: true },
    (snap) => {
      callback({
        exists: snap.exists(),
        data: snap.exists() ? snap.data() : null,
        fromCache: snap.metadata.fromCache,
        error: null,
      });
    },
    (err) => {
      console.error('Firestore listener error:', err);
      callback({ exists: false, data: null, fromCache: true, error: err });
    }
  );
}

/**
 * Write (overwrite) the full house document.
 */
export async function saveHouseData(houseCode, data) {
  const ref = doc(db, COLLECTION, houseCode.toUpperCase().trim());
  await setDoc(ref, {
    properties:  data.properties  || [],
    tenants:     data.tenants     || [],
    ledger:      data.ledger      || {},
    pastTenants: data.pastTenants || [],
  });
}

/**
 * Check if a house code already exists in Firestore.
 */
export async function houseExists(houseCode) {
  const ref = doc(db, COLLECTION, houseCode.toUpperCase().trim());
  const snap = await getDoc(ref);
  return snap.exists();
}

/**
 * Read any legacy data from localStorage (old IndexedDB keys).
 * Returns null if nothing found.
 */
export function readLegacyLocalData() {
  const find = (keys) => {
    for (const k of keys) {
      const val = localStorage.getItem(k);
      if (val) return JSON.parse(val);
    }
    return null;
  };

  const properties  = find(['rentarc_properties',  'rentease_properties']);
  const tenants     = find(['rentarc_tenants',      'rentease_tenants']);
  const ledger      = find(['rentarc_ledger',       'rentease_ledger']);
  const pastTenants = find(['rentarc_past_tenants', 'rentease_past_tenants']);

  if (!properties && !tenants) return null;

  return {
    properties:  properties  || [],
    tenants:     tenants     || [],
    ledger:      ledger      || {},
    pastTenants: pastTenants || [],
  };
}

/**
 * Remove all legacy localStorage keys after migration.
 */
export function clearLegacyLocalData() {
  const keys = [
    'rentarc_properties', 'rentarc_tenants', 'rentarc_ledger', 'rentarc_past_tenants',
    'rentease_properties', 'rentease_tenants', 'rentease_ledger', 'rentease_past_tenants',
  ];
  keys.forEach((k) => localStorage.removeItem(k));
}
