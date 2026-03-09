/**
 * Service de gestion des codes d'accès
 * 
 * Supporte deux types de codes :
 * - Code individuel : 1 code = 1 candidat (lié à un appareil)
 * - Code universel : 1 code = plusieurs candidats (pour examens collectifs)
 */

import { supabase, isSupabaseConfigured } from '../config/supabase';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

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
  is_universal: boolean;
  max_uses: number | null;
  current_uses: number;
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
  isUniversal?: boolean;
  maxUses?: number;
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════

// Mot de passe administrateur (à changer en production)
const ADMIN_PASSWORD = 'QCM_ADMIN_2024';

// ═══════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════

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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclut I, O, 0, 1
  let token = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) token += '-';
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ═══════════════════════════════════════════════════════════════════
// VÉRIFICATION DU CODE
// ═══════════════════════════════════════════════════════════════════

/**
 * Vérifie si un code d'accès est valide
 * Gère les codes individuels et universels
 */
export async function verifyAccessCode(token: string): Promise<VerifyCodeResult> {
  console.log('🔐 Vérification du code d\'accès:', token);

  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message: 'Base de données non configurée. Contactez l\'administrateur.',
    };
  }

  const cleanToken = token.toUpperCase().trim().replace(/\s/g, '');
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

    console.log('📋 Code trouvé:', {
      token: code.token,
      isUniversal: code.is_universal,
      maxUses: code.max_uses,
      currentUses: code.current_uses,
      used: code.used,
    });

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

    // ═══════════════════════════════════════════════════════════════
    // CODE UNIVERSEL (plusieurs utilisateurs)
    // ═══════════════════════════════════════════════════════════════
    if (code.is_universal) {
      // Vérifier si le nombre max d'utilisations est atteint
      if (code.max_uses && code.current_uses >= code.max_uses) {
        console.log('❌ Code universel épuisé');
        return {
          success: false,
          message: 'Ce code a atteint le nombre maximum d\'utilisations.',
        };
      }

      // Incrémenter le compteur d'utilisations
      const { error: updateError } = await supabase
        .from('access_codes')
        .update({
          current_uses: (code.current_uses || 0) + 1,
          used_at: new Date().toISOString(),
        })
        .eq('id', code.id);

      if (updateError) {
        console.error('❌ Erreur mise à jour code universel:', updateError);
        return {
          success: false,
          message: 'Erreur lors de la validation du code. Réessayez.',
        };
      }

      console.log('✅ Code universel validé');
      return {
        success: true,
        message: 'Code valide. Vous pouvez commencer le QCM.',
        code: code,
        concoursId: code.concours_id,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // CODE INDIVIDUEL (un seul utilisateur)
    // ═══════════════════════════════════════════════════════════════
    
    // Vérifier si le code a déjà été utilisé sur un autre appareil
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
        current_uses: 1,
      })
      .eq('id', code.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour code:', updateError);
      return {
        success: false,
        message: 'Erreur lors de la validation du code. Réessayez.',
      };
    }

    console.log('✅ Code individuel validé et appareil enregistré:', cleanToken);
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

// ═══════════════════════════════════════════════════════════════════
// CRÉATION DE CODE (ADMIN)
// ═══════════════════════════════════════════════════════════════════

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
        is_universal: params.isUniversal || false,
        max_uses: params.isUniversal ? (params.maxUses || 100) : 1,
        current_uses: 0,
      });

    if (error) {
      console.error('❌ Erreur création code:', error);
      return {
        success: false,
        message: 'Erreur lors de la création du code.',
      };
    }

    console.log('✅ Code créé:', token, params.isUniversal ? '(universel)' : '(individuel)');
    return {
      success: true,
      message: `Code ${params.isUniversal ? 'universel' : 'individuel'} créé. Valide ${expiresInHours}h.`,
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

// ═══════════════════════════════════════════════════════════════════
// GESTION DES CODES (ADMIN)
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
// STOCKAGE LOCAL
// ═══════════════════════════════════════════════════════════════════

/**
 * Récupère le code stocké localement
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
 * Efface le code stocké
 */
export function clearStoredAccessCode(): void {
  localStorage.removeItem('qcm_access_code');
}
