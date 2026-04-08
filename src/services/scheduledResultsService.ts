/**
 * SERVICE DE GESTION DES ENVOIS PROGRAMMÉS (DÉLIBÉRATION)
 * 
 * Gère le cycle de vie des résultats en attente d'envoi :
 * - Création d'un envoi programmé (après soumission du quiz)
 * - Programmation d'une date/heure d'envoi (admin)
 * - Envoi immédiat (admin override)
 * - Listing des envois avec filtres
 * - Génération de lien WhatsApp (fallback sans email)
 */

import { supabase, isSupabaseConfigured } from '../config/supabase';
import emailjs from '@emailjs/browser';
import { EMAILJS_CONFIG } from '../config/emailjs';
import { ScheduledResult, ScheduledResultStatus } from '../types';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface CreateScheduledResultParams {
  submissionId: string;
  userEmail?: string | null;
  userPhone?: string | null;
  candidateName: string;
  concoursName: string;
  score: number;
  scoreFinal?: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  proctoringPenalty?: number;
  correctionUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════
// CRÉATION D'UN ENVOI EN ATTENTE
// ═══════════════════════════════════════════════════════════════════

/**
 * Enregistre un résultat en attente d'envoi (appelé après soumission du quiz)
 * Aucun email n'est envoyé — l'admin décide quand envoyer
 */
export async function createScheduledResult(
  params: CreateScheduledResultParams
): Promise<{ success: boolean; id?: string; message: string }> {
  console.log('📋 Enregistrement du résultat en attente d\'envoi...');

  if (!isSupabaseConfigured || !supabase) {
    console.warn('⚠️ Supabase non configuré — résultat non enregistré pour envoi');
    return { success: false, message: 'Supabase non configuré' };
  }

  try {
    const { data, error } = await supabase
      .from('scheduled_results')
      .insert({
        submission_id: params.submissionId,
        user_email: params.userEmail || null,
        user_phone: params.userPhone || null,
        candidate_name: params.candidateName,
        concours_name: params.concoursName,
        score: params.score,
        score_final: params.scoreFinal ?? params.score,
        total_questions: params.totalQuestions,
        correct_answers: params.correctAnswers,
        wrong_answers: params.wrongAnswers,
        unanswered: params.unanswered,
        proctoring_penalty: params.proctoringPenalty || 0,
        correction_url: params.correctionUrl || null,
        scheduled_at: null, // L'admin programmera la date
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Erreur enregistrement envoi:', error);
      return { success: false, message: error.message };
    }

    console.log('✅ Résultat enregistré en attente (ID:', data?.id, ')');
    return { success: true, id: data?.id, message: 'Résultat enregistré en attente d\'envoi' };
  } catch (err) {
    console.error('❌ Exception:', err);
    return { success: false, message: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

// ═══════════════════════════════════════════════════════════════════
// PROGRAMMATION D'UN ENVOI (ADMIN)
// ═══════════════════════════════════════════════════════════════════

/**
 * Programmer l'envoi d'un résultat à une date/heure donnée
 */
export async function scheduleResult(
  id: string,
  scheduledAt: Date
): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase non configuré' };
  }

  try {
    const { error } = await supabase
      .from('scheduled_results')
      .update({
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending',
      })
      .eq('id', id);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: `Envoi programmé pour le ${scheduledAt.toLocaleString('fr-FR')}` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

/**
 * Programmer l'envoi pour TOUS les résultats en attente
 */
export async function scheduleAllResults(
  scheduledAt: Date
): Promise<{ success: boolean; count: number; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, count: 0, message: 'Supabase non configuré' };
  }

  try {
    const { data, error } = await supabase
      .from('scheduled_results')
      .update({
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending',
      })
      .eq('status', 'pending')
      .select('id');

    if (error) {
      return { success: false, count: 0, message: error.message };
    }

    const count = data?.length || 0;
    return {
      success: true,
      count,
      message: `${count} envoi(s) programmé(s) pour le ${scheduledAt.toLocaleString('fr-FR')}`,
    };
  } catch (err) {
    return { success: false, count: 0, message: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

// ═══════════════════════════════════════════════════════════════════
// LISTING DES ENVOIS (ADMIN)
// ═══════════════════════════════════════════════════════════════════

/**
 * Récupérer la liste des envois programmés
 */
export async function getScheduledResults(
  filters?: { status?: ScheduledResultStatus; concoursName?: string }
): Promise<{ success: boolean; data: ScheduledResult[]; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, data: [], message: 'Supabase non configuré' };
  }

  try {
    let query = supabase
      .from('scheduled_results')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.concoursName) {
      query = query.eq('concours_name', filters.concoursName);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, data: [], message: error.message };
    }

    return { success: true, data: data || [], message: `${data?.length || 0} résultat(s) trouvé(s)` };
  } catch (err) {
    return { success: false, data: [], message: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

// ═══════════════════════════════════════════════════════════════════
// ENVOI IMMÉDIAT (ADMIN OVERRIDE)
// ═══════════════════════════════════════════════════════════════════

/**
 * Envoyer immédiatement un résultat par email (admin override)
 * Envoie à la fois au candidat ET à l'admin
 */
export async function sendResultNow(
  id: string
): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase non configuré' };
  }

  try {
    // 1. Récupérer le résultat
    const { data: result, error: fetchError } = await supabase
      .from('scheduled_results')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !result) {
      return { success: false, message: 'Résultat introuvable' };
    }

    // 2. Envoyer l'email au candidat si email disponible
    if (result.user_email) {
      try {
        const displayScore = result.score_final ?? result.score;
        const percentage = result.total_questions > 0 
          ? Math.round((displayScore / result.total_questions) * 100) 
          : 0;
        const mentionText = percentage >= 90 ? 'Excellent' :
                            percentage >= 80 ? 'Très Bien' :
                            percentage >= 70 ? 'Bien' :
                            percentage >= 60 ? 'Assez Bien' :
                            percentage >= 50 ? 'Passable' : 'Insuffisant';

        await emailjs.send(
          EMAILJS_CONFIG.serviceId,
          EMAILJS_CONFIG.candidateTemplateId,
          {
            to_email: result.user_email,
            candidate_name: result.candidate_name,
            concours_name: result.concours_name,
            score: displayScore,
            total_questions: result.total_questions,
            bonnes_reponses: result.correct_answers,
            mauvaises_reponses: result.wrong_answers,
            sans_reponse: result.unanswered,
            percentage,
            mention: mentionText,
            correction_url: result.correction_url || '',
            submission_date: new Date(result.created_at).toLocaleString('fr-FR', {
              day: '2-digit', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            }),
          },
          EMAILJS_CONFIG.publicKey
        );

        console.log('✅ Email candidat envoyé à:', result.user_email);
      } catch (emailErr) {
        console.error('❌ Erreur envoi email candidat:', emailErr);
        // On continue quand même pour envoyer à l'admin
      }
    }

    // 3. Envoyer l'email à l'admin
    try {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        {
          to_email: EMAILJS_CONFIG.adminEmail,
          candidate_name: result.candidate_name,
          candidate_phone: result.user_phone || '',
          concours_name: result.concours_name,
          score: result.score,
          score_final: result.score_final ?? result.score,
          total_questions: result.total_questions,
          correct_count: result.correct_answers,
          wrong_count: result.wrong_answers,
          unanswered_count: result.unanswered,
          proctoring_penalty: Math.abs(result.proctoring_penalty || 0),
          proctoring_details: '',
          correction_url: result.correction_url || '',
          submission_date: new Date(result.created_at).toLocaleString('fr-FR', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          }),
        },
        EMAILJS_CONFIG.publicKey
      );
      console.log('✅ Email admin envoyé');
    } catch (adminErr) {
      console.error('❌ Erreur envoi email admin:', adminErr);
    }

    // 4. Marquer comme envoyé
    const { error: updateError } = await supabase
      .from('scheduled_results')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('❌ Erreur mise à jour statut:', updateError);
      return { success: false, message: 'Email envoyé mais erreur de mise à jour du statut' };
    }

    return { success: true, message: 'Résultat envoyé avec succès' };
  } catch (err) {
    // Marquer en erreur
    await supabase
      ?.from('scheduled_results')
      .update({
        status: 'error',
        error_message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
      .eq('id', id);

    return { success: false, message: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

// ═══════════════════════════════════════════════════════════════════
// WHATSAPP FALLBACK
// ═══════════════════════════════════════════════════════════════════

/**
 * Génère un lien WhatsApp pour envoyer les résultats manuellement
 */
export function generateWhatsAppLink(
  phone: string,
  candidateName: string,
  score: number,
  totalQuestions: number,
  correctionUrl?: string
): string {
  // Nettoyer le numéro de téléphone
  const cleanPhone = phone.replace(/\s+/g, '').replace(/^0/, '+226');
  
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  
  let message = `Bonjour ${candidateName},\n\n`;
  message += `📋 *Résultats QCM Concours BF*\n\n`;
  message += `📊 Score : ${score}/${totalQuestions} (${percentage}%)\n`;
  
  if (correctionUrl) {
    message += `\n🔗 Correction détaillée :\n${correctionUrl}\n`;
  }
  
  message += `\nCordialement,\nL'administration QCM Concours BF`;

  return `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(message)}`;
}

// ═══════════════════════════════════════════════════════════════════
// SUPPRESSION (ADMIN)
// ═══════════════════════════════════════════════════════════════════

/**
 * Supprimer un envoi programmé
 */
export async function deleteScheduledResult(
  id: string
): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase non configuré' };
  }

  try {
    const { error } = await supabase
      .from('scheduled_results')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Envoi supprimé' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}
