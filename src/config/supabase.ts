import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types pour les utilisateurs
export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

// Configuration Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérifier si Supabase est configuré
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Créer le client Supabase seulement si configuré
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Afficher un message dans la console
if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Supabase non configuré. L\'authentification est désactivée.\n' +
    'Pour activer l\'authentification, créez un fichier .env avec:\n' +
    'VITE_SUPABASE_URL=votre_url\n' +
    'VITE_SUPABASE_ANON_KEY=votre_clé_anon'
  );
} else {
  console.log('✅ Supabase configuré avec succès');
}

// Fonctions d'authentification

/**
 * Inscription d'un nouvel utilisateur
 * Le profil est créé automatiquement par le trigger dans Supabase
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  phone?: string
): Promise<{ success: boolean; message: string; user?: UserProfile }> {
  if (!supabase) {
    return { success: false, message: 'Supabase non configuré' };
  }

  try {
    // 1. Créer l'utilisateur dans auth.users avec les métadonnées
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          name: fullName,
          phone: phone || '',
        },
      },
    });

    if (error) {
      console.error('Erreur inscription:', error);
      
      // Messages d'erreur en français
      const errorMsg = error.message.toLowerCase();
      
      if (errorMsg.includes('rate limit') || errorMsg.includes('email rate limit exceeded')) {
        return { 
          success: false, 
          message: 'Limite de tentatives atteinte. Veuillez patienter quelques minutes ou désactiver la confirmation email dans les paramètres Supabase.' 
        };
      }
      if (errorMsg.includes('already registered') || errorMsg.includes('user already registered')) {
        return { success: false, message: 'Cet email est déjà utilisé. Essayez de vous connecter.' };
      }
      if (errorMsg.includes('weak password') || (errorMsg.includes('password') && errorMsg.includes('weak'))) {
        return { success: false, message: 'Le mot de passe est trop faible. Utilisez au moins 6 caractères avec des chiffres.' };
      }
      if (errorMsg.includes('password')) {
        return { success: false, message: 'Le mot de passe doit contenir au moins 6 caractères' };
      }
      if (errorMsg.includes('invalid email') || errorMsg.includes('invalid_email')) {
        return { success: false, message: 'Adresse email invalide' };
      }
      if (errorMsg.includes('signup is disabled')) {
        return { success: false, message: 'Les inscriptions sont temporairement désactivées' };
      }
      
      return { success: false, message: error.message };
    }

    if (!data.user) {
      return { success: false, message: 'Erreur lors de la création du compte' };
    }

    // 2. Attendre un peu que le trigger crée le profil
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Récupérer le profil créé par le trigger
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Si le trigger n'a pas créé le profil, on le crée manuellement
    if (!profile) {
      console.log('Profil non trouvé, tentative de création manuelle...');
      
      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          full_name: fullName,
          email: email,
          phone: phone || '',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.warn('Création manuelle échouée:', insertError.message);
        // L'utilisateur est quand même créé dans auth, donc on retourne un succès partiel
        return {
          success: true,
          message: `Inscription réussie ! Bienvenue ${fullName}`,
          user: {
            id: data.user.id,
            full_name: fullName,
            email: email,
            phone: phone,
          },
        };
      }

      return {
        success: true,
        message: `Inscription réussie ! Bienvenue ${fullName}`,
        user: newProfile,
      };
    }

    return {
      success: true,
      message: `Inscription réussie ! Bienvenue ${profile.full_name}`,
      user: profile,
    };
  } catch (error) {
    console.error('Erreur inattendue:', error);
    return { success: false, message: 'Une erreur inattendue est survenue' };
  }
}

/**
 * Connexion d'un utilisateur
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; message: string; user?: UserProfile }> {
  if (!supabase) {
    return { success: false, message: 'Supabase non configuré' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Erreur connexion:', error);
      
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, message: 'Email ou mot de passe incorrect' };
      }
      if (error.message.includes('Email not confirmed')) {
        return { success: false, message: 'Veuillez confirmer votre email avant de vous connecter' };
      }
      
      return { success: false, message: error.message };
    }

    if (!data.user) {
      return { success: false, message: 'Erreur lors de la connexion' };
    }

    // Récupérer le profil
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profile) {
      return {
        success: true,
        message: `Bienvenue ${profile.full_name} !`,
        user: profile,
      };
    }

    // Si pas de profil, utiliser les métadonnées
    return {
      success: true,
      message: `Bienvenue ${data.user.user_metadata?.full_name || 'Utilisateur'} !`,
      user: {
        id: data.user.id,
        full_name: data.user.user_metadata?.full_name || 'Utilisateur',
        email: data.user.email || email,
        phone: data.user.user_metadata?.phone,
      },
    };
  } catch (error) {
    console.error('Erreur inattendue:', error);
    return { success: false, message: 'Une erreur inattendue est survenue' };
  }
}

/**
 * Déconnexion
 */
export async function signOut(): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase non configuré' };
  }

  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, message: error.message };
    }
    
    return { success: true, message: 'Déconnexion réussie' };
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    return { success: false, message: 'Erreur lors de la déconnexion' };
  }
}

/**
 * Récupérer le profil de l'utilisateur connecté
 */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    // Essayer de récupérer le profil depuis la table users
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      return profile;
    }

    // Sinon, utiliser les métadonnées de l'utilisateur
    return {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Utilisateur',
      email: user.email || '',
      phone: user.user_metadata?.phone,
    };
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    return null;
  }
}

/**
 * Mettre à jour le profil
 */
export async function updateProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ success: boolean; message: string; user?: UserProfile }> {
  if (!supabase) {
    return { success: false, message: 'Supabase non configuré' };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Erreur mise à jour profil:', error);
      return { success: false, message: 'Erreur lors de la mise à jour du profil' };
    }

    return {
      success: true,
      message: 'Profil mis à jour avec succès',
      user: data,
    };
  } catch (error) {
    console.error('Erreur inattendue:', error);
    return { success: false, message: 'Une erreur inattendue est survenue' };
  }
}

/**
 * Réinitialisation du mot de passe
 */
export async function resetPassword(email: string): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase non configuré' };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Un email de réinitialisation a été envoyé' };
  } catch (error) {
    console.error('Erreur réinitialisation:', error);
    return { success: false, message: 'Erreur lors de l\'envoi de l\'email' };
  }
}
