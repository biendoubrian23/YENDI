import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, ClientProfile } from '../lib/supabase';
import { Cache } from '../lib/cache';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  clientProfile: ClientProfile | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string, phone?: string, referralCode?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  clientProfile: null,
  isLoading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger le profil client (cache-first, puis réseau)
  const fetchClientProfile = async (userId: string, userMetadata?: any) => {
    try {
      // 1. Charger depuis le cache immédiatement
      const cached = await Cache.get<ClientProfile>(Cache.KEYS.CLIENT_PROFILE);
      if (cached && cached.id === userId) {
        setClientProfile(cached);
      }

      // 2. Tenter de charger depuis le réseau
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.log('Pas de profil client trouvé:', error.message);
        // En offline on garde le cache déjà chargé ci-dessus
        return;
      }
      
      // Si le full_name est vide ou "Client", utiliser user_metadata
      let profile = data as ClientProfile;
      if ((!profile.full_name || profile.full_name === 'Client') && userMetadata?.full_name) {
        profile = { ...profile, full_name: userMetadata.full_name };
        // Mettre à jour la BDD aussi
        await supabase
          .from('clients')
          .update({ full_name: userMetadata.full_name })
          .eq('id', userId);
      }
      
      setClientProfile(profile);
      // 3. Sauvegarder en cache pour utilisation offline
      await Cache.set(Cache.KEYS.CLIENT_PROFILE, profile);
    } catch (err) {
      console.error('Erreur chargement profil:', err);
      // En cas d'erreur réseau, le cache chargé en étape 1 reste affiché
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchClientProfile(user.id, user.user_metadata);
    }
  };

  useEffect(() => {
    // Récupérer la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchClientProfile(session.user.id, session.user.user_metadata);
      }
      setIsLoading(false);
    });

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Petit délai pour laisser le trigger créer le profil
          setTimeout(() => fetchClientProfile(session.user.id, session.user.user_metadata), 500);
        } else {
          setClientProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone?: string, referralCode?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
          referral_code_used: referralCode || null,
        },
      },
    });

    // Si inscription réussie et code de parrainage fourni, appliquer le bonus
    if (!error && data?.user && referralCode?.trim()) {
      // Attendre que le trigger crée le profil client
      setTimeout(async () => {
        try {
          const { data: bonusResult } = await supabase.rpc('apply_referral_bonus', {
            p_new_client_id: data.user!.id,
            p_referral_code: referralCode.trim(),
          });
          console.log('Bonus parrainage:', bonusResult);
        } catch (err) {
          console.log('Erreur bonus parrainage:', err);
        }
      }, 1500);
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setClientProfile(null);
    // Vider le cache à la déconnexion
    await Cache.clearAll();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        clientProfile,
        isLoading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
