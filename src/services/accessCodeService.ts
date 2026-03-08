/**
 * Service de gestion des codes d'accès
 * Permet de vérifier, valider et gérer les codes uniques pour accéder au QCM
 */

import { supabase, isSupabaseConfigured } from '../config/supabase';

// Types
export interface AccessCode {
  id: string;
  token: string;
  concours_id: string | null;
  candidate_name: string | null;
  candidate_email: string | null;
  expires_at: string;
  used: boolean;
  used_at: string | null;
  device_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface VerifyCodeResult {
  success: boolean;
  message: string;
  code?: AccessCode;
  concoursId?: string | null;
}

export interface CreateCodeParams {
  concoursId?: string;
  candidateName?: string;
  candidateEmail?: string;
  expiresInHours?: number;
  adminPassword: string;
}

// Mot de passe administrateur (à changer en production)
const ADMIN_PASSWORD = 'QCM_ADMIN_2024';

/**
 * Génère un identifiant unique pour l'appareil
 */
export function generateDeviceId(): string {
  const existingId = localStorage.getItem('qcm_device_id');
  if (existingId) {
    return existingId;
  }

  // Créer un identifiant unique basé sur plusieurs facteurs
  const navigatorInfo = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join('|');

  // Hash simple
  let hash = 0;
  for (let i = 0; i < navigatorInfo.length; i++) {
    const char = navigatorInfo.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const deviceId = `DEV_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
  localStorage.setItem('qcm_device_id', deviceId);
  return deviceId;
}

/**
 * Génère un code d'accès aléatoire
 */
export function generateAccessToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclut I, O, 0, 1 pour éviter la confusion
  let token = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) token += '-'; // Format: XXXX-XXXX
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Vérifie si un code d'accès est valide
 */
export async function verifyAccessCode(token: string): Promise<VerifyCodeResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Base de données non configurée. Contactez l\'administrateur.',
    };
  }

  const cleanToken = token.toUpperCase().trim();
  const deviceId = generateDeviceId();

  try {
    // Rechercher le code
    const { data: code, error } = await supabase
      .from('access_codes')
      .select('*')
      .eq('token', cleanToken)
      .single();

    if (error || !code) {
      console.log('❌ Code non trouvé:', cleanToken);
      return {
        success: false,
        message: 'Code invalide. Vérifiez votre code et réessayez.',
      };
    }

    // Vérifier si le code est expiré
    const expiresAt = new Date(code.expires_at);
    const now = new Date();
    if (now > expiresAt) {
      console.log('❌ Code expiré:', cleanToken);
      return {
        success: false,
        message: 'Ce code a expiré. Demandez un nouveau code à l\'administrateur.',
      };
    }

    // Vérifier si le code a déjà été utilisé
    if (code.used && code.device_id !== deviceId) {
      console.log('❌ Code déjà utilisé sur un autre appareil:', cleanToken);
      return {
        success: false,
        message: 'Ce code a déjà été utilisé sur un autre appareil.',
      };
    }

    // Si le code est déjà lié à cet appareil, autoriser l'accès
    if (code.device_id === deviceId) {
      console.log('✅ Code valide (même appareil):', cleanToken);
      return {
        success: true,
        message: 'Code valide. Vous pouvez continuer.',
        code: code,
        concoursId: code.concours_id,
      };
    }

    // Marquer le code comme utilisé et enregistrer l'appareil
    const { error: updateError } = await supabase
      .from('access_codes')
      .update({
        used: true,
        used_at: new Date().toISOString(),
        device_id: deviceId,
      })
      .eq('id', code.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour code:', updateError);
      return {
        success: false,
        message: 'Erreur lors de la validation du code. Réessayez.',
      };
    }

    console.log('✅ Code validé et appareil enregistré:', cleanToken);
    return {
      success: true,
      message: 'Code validé avec succès. Vous pouvez commencer le QCM.',
      code: code,
      concoursId: code.concours_id,
    };

  } catch (err) {
    console.error('❌ Erreur vérification code:', err);
    return {
      success: false,
      message: 'Erreur de connexion. Vérifiez votre connexion internet.',
    };
  }
}

/**
 * Crée un nouveau code d'accès (admin uniquement)
 */
export async function createAccessCode(params: CreateCodeParams): Promise<{
  success: boolean;
  message: string;
  token?: string;
}> {
  // Vérifier le mot de passe admin
  if (params.adminPassword !== ADMIN_PASSWORD) {
    return {
      success: false,
      message: 'Mot de passe administrateur incorrect.',
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Base de données non configurée.',
    };
  }

  const token = generateAccessToken();
  const expiresInHours = params.expiresInHours || 24;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  try {
    const { error } = await supabase
      .from('access_codes')
      .insert({
        token: token,
        concours_id: params.concoursId || null,
        candidate_name: params.candidateName || null,
        candidate_email: params.candidateEmail || null,
        expires_at: expiresAt.toISOString(),
        used: false,
        device_id: null,
        created_by: 'admin',
      });

    if (error) {
      console.error('❌ Erreur création code:', error);
      return {
        success: false,
        message: 'Erreur lors de la création du code.',
      };
    }

    console.log('✅ Code créé:', token);
    return {
      success: true,
      message: `Code créé avec succès. Valide pendant ${expiresInHours} heures.`,
      token: token,
    };

  } catch (err) {
    console.error('❌ Erreur création code:', err);
    return {
      success: false,
      message: 'Erreur de connexion.',
    };
  }
}

/**
 * Liste tous les codes (admin uniquement)
 */
export async function listAccessCodes(adminPassword: string): Promise<{
  success: boolean;
  message: string;
  codes?: AccessCode[];
}> {
  if (adminPassword !== ADMIN_PASSWORD) {
    return {
      success: false,
      message: 'Mot de passe administrateur incorrect.',
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Base de données non configurée.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('access_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        message: 'Erreur lors de la récupération des codes.',
      };
    }

    return {
      success: true,
      message: `${data.length} code(s) trouvé(s).`,
      codes: data,
    };

  } catch (err) {
    return {
      success: false,
      message: 'Erreur de connexion.',
    };
  }
}

/**
 * Supprime un code (admin uniquement)
 */
export async function deleteAccessCode(codeId: string, adminPassword: string): Promise<{
  success: boolean;
  message: string;
}> {
  if (adminPassword !== ADMIN_PASSWORD) {
    return {
      success: false,
      message: 'Mot de passe administrateur incorrect.',
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Base de données non configurée.',
    };
  }

  try {
    const { error } = await supabase
      .from('access_codes')
      .delete()
      .eq('id', codeId);

    if (error) {
      return {
        success: false,
        message: 'Erreur lors de la suppression du code.',
      };
    }

    return {
      success: true,
      message: 'Code supprimé avec succès.',
    };

  } catch (err) {
    return {
      success: false,
      message: 'Erreur de connexion.',
    };
  }
}

/**
 * Vérifie si un code a déjà été validé sur cet appareil (pour permettre de reprendre)
 */
export function getStoredAccessCode(): string | null {
  return localStorage.getItem('qcm_access_code');
}

/**
 * Stocke le code validé localement
 */
export function storeAccessCode(token: string): void {
  localStorage.setItem('qcm_access_code', token);
}

/**
 * Efface le code stocké (après soumission du QCM par exemple)
 */
export function clearStoredAccessCode(): void {
  localStorage.removeItem('qcm_access_code');
}
