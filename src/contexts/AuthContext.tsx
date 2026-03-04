import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { 
  supabase, 
  isSupabaseConfigured, 
  UserProfile,
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  resetPassword as supabaseResetPassword,
  getCurrentProfile,
  updateProfile as supabaseUpdateProfile
} from '../config/supabase';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  profile: UserProfile | null; // Alias pour userProfile
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; message: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger le profil de l'utilisateur
  const loadProfile = async (_userId?: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const profile = await getCurrentProfile();
      setUserProfile(profile);
      return profile;
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      return null;
    }
  };

  // Rafraîchir le profil
  const refreshProfile = async () => {
    await loadProfile();
  };

  useEffect(() => {
    // Si Supabase n'est pas configuré, on arrête le chargement
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Vérifier la session au chargement
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase!.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        }
      } catch (error) {
        console.error('Erreur vérification session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase!.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          // Attendre un peu pour que le trigger crée le profil
          setTimeout(async () => {
            await loadProfile(session.user.id);
          }, 500);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
        } else if (event === 'USER_UPDATED' && session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'L\'authentification n\'est pas configurée' };
    }

    const result = await supabaseSignIn(email, password);
    
    if (result.success && result.user) {
      setUserProfile(result.user);
    }
    
    return result;
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'L\'authentification n\'est pas configurée' };
    }

    const result = await supabaseSignUp(email, password, fullName, phone);
    
    if (result.success && result.user) {
      setUserProfile(result.user);
    }
    
    return result;
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      return;
    }

    await supabaseSignOut();
    setUser(null);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'L\'authentification n\'est pas configurée' };
    }

    return await supabaseResetPassword(email);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'L\'authentification n\'est pas configurée' };
    }

    if (!user) {
      return { success: false, message: 'Utilisateur non connecté' };
    }

    const result = await supabaseUpdateProfile(user.id, updates);
    
    if (result.success && result.user) {
      setUserProfile(result.user);
    }
    
    return result;
  };

  const value: AuthContextType = {
    user,
    userProfile,
    profile: userProfile, // Alias
    loading,
    isConfigured: isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
