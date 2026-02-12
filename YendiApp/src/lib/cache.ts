import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEYS = {
  CLIENT_PROFILE: 'cache_client_profile',
  RESERVATIONS: 'cache_reservations',
} as const;

/**
 * Sauvegarde des données en cache local (AsyncStorage).
 * Silencieux en cas d'erreur — le cache est un bonus, pas critique.
 */
async function set(key: string, data: any): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Silencieux — pas grave si le cache échoue
  }
}

/**
 * Récupère des données du cache local.
 * Retourne null si rien en cache ou données expirées.
 * @param maxAgeMs - Durée max du cache en ms (défaut: 7 jours)
 */
async function get<T>(key: string, maxAgeMs = 7 * 24 * 60 * 60 * 1000): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    // Vérifier expiration
    if (Date.now() - ts > maxAgeMs) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

/**
 * Supprime une entrée du cache.
 */
async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Silencieux
  }
}

/**
 * Vide tout le cache applicatif (pas le cache auth Supabase).
 */
async function clearAll(): Promise<void> {
  try {
    await Promise.all(
      Object.values(CACHE_KEYS).map((k) => AsyncStorage.removeItem(k))
    );
  } catch {
    // Silencieux
  }
}

export const Cache = {
  KEYS: CACHE_KEYS,
  set,
  get,
  remove,
  clearAll,
};
