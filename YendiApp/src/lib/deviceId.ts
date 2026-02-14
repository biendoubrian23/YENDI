import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@yendi_device_id';

let cachedDeviceId: string | null = null;

/**
 * Retourne un UUID persistant unique à cet appareil.
 * Créé au premier lancement, ne change jamais.
 * Utilisé pour le countdown FOMO (user_price_locks).
 */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      cachedDeviceId = stored;
      return stored;
    }
  } catch {
    // ignore read errors
  }

  // Générer un UUID v4 sans dépendance externe
  const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  } catch {
    // ignore write errors
  }

  cachedDeviceId = id;
  return id;
}
