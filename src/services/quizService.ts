/**
 * Service de gestion des quiz avec Supabase
 * 
 * ARCHITECTURE SÉCURISÉE :
 * - Les questions sont chargées via la vue questions_public (SANS correct_answers)
 * - Le score est calculé côté serveur via la fonction RPC submit_quiz
 * - La correction est récupérée via la fonction RPC get_correction
 * - Le frontend ne voit JAMAIS les bonnes réponses avant soumission
 */

import { supabase, isSupabaseConfigured } from '../config/supabase';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface QuizAnswer {
  question_id: number;
  selected_options: number[];
}

export interface SubmitQuizParams {
  concoursId: string;
  candidateName: string;
  candidatePhone?: string;
  answers: QuizAnswer[];
  proctoringPenalty?: number; // Valeur négative (ex: -5)
  proctoringAlerts?: { type: string; count: number; totalPoints: number }[]; // Tableau des alertes pour le comptage
}

export interface SubmitQuizResult {
  success: boolean;
  error?: string;
  submissionId?: string;
  score?: number;
  totalQuestions?: number;
  correctCount?: number;
  wrongCount?: number;
  unansweredCount?: number;
  percentage?: number;
}

export interface CorrectionQuestion {
  id: number;
  question_text: string;
  category_id: string;
  options: string[];
  correct_answers: number[];
  user_answers: number[];
  is_correct: boolean;
  points: number;
  has_latex?: boolean;
  image_url?: string;
  explanation?: string; // ← Explication détaillée de la réponse
}

export interface CorrectionResult {
  success: boolean;
  error?: string;
  submissionId?: string;
  candidateName?: string;
  candidatePhone?: string;
  concoursId?: string;
  concoursName?: string;
  score?: number;
  scoreFinal?: number;
  totalQuestions?: number;
  correctCount?: number;
  wrongCount?: number;
  unansweredCount?: number;
  percentage?: number;
  proctoringPenalty?: number;
  proctoringAlerts?: { type: string; count: number; totalPoints: number }[];
  questions?: CorrectionQuestion[];
  createdAt?: string;
}

// ═══════════════════════════════════════════════════════════════════
// FONCTIONS PRINCIPALES
// ═══════════════════════════════════════════════════════════════════

/**
 * Soumet les réponses du quiz à Supabase pour calcul du score côté serveur
 */
export async function submitQuiz(params: SubmitQuizParams): Promise<SubmitQuizResult> {
  console.log('══════════════════════════════════════════');
  console.log('📤 SOUMISSION DU QUIZ À SUPABASE');
  console.log('══════════════════════════════════════════');
  console.log('   Concours ID:', params.concoursId);
  console.log('   Candidat:', params.candidateName);
  console.log('   Téléphone:', params.candidatePhone);
  console.log('   Nombre de réponses:', params.answers.length);
  
  // Afficher les 3 premières réponses pour debug
  if (params.answers.length > 0) {
    console.log('   Aperçu des réponses:');
    params.answers.slice(0, 3).forEach((a, i) => {
      console.log(`      ${i + 1}. Question ${a.question_id}: [${a.selected_options.join(', ')}]`);
    });
  }

  if (!isSupabaseConfigured || !supabase) {
    console.error('❌ Supabase non configuré');
    return {
      success: false,
      error: 'Supabase non configuré. Le calcul du score nécessite une connexion à Supabase.'
    };
  }

  try {
    // Calculer le nombre total d'alertes de proctoring
    let alertsCount = 0;
    if (params.proctoringAlerts && Array.isArray(params.proctoringAlerts)) {
      alertsCount = params.proctoringAlerts.reduce((sum, alert) => sum + (alert.count || 0), 0);
    }

    // Préparer les paramètres pour la fonction RPC
    // IMPORTANT: p_proctoring_alerts doit être un INTEGER, pas un tableau
    const rpcParams = {
      p_concours_id: params.concoursId,
      p_candidate_name: params.candidateName,
      p_candidate_phone: params.candidatePhone || '',
      p_answers: params.answers,
      p_proctoring_penalty: Math.abs(params.proctoringPenalty || 0), // Valeur positive
      p_proctoring_alerts: alertsCount // Nombre d'alertes (INTEGER)
    };

    console.log('📤 Appel RPC submit_quiz avec:', JSON.stringify(rpcParams, null, 2));
    console.log('   Pénalité proctoring:', rpcParams.p_proctoring_penalty);
    console.log('   Nombre d\'alertes:', alertsCount);

    const { data, error } = await supabase.rpc('submit_quiz', rpcParams);

    if (error) {
      console.error('❌ Erreur RPC submit_quiz:', error);
      return {
        success: false,
        error: `Erreur serveur: ${error.message}`
      };
    }

    console.log('📥 Résultat brut de submit_quiz:', JSON.stringify(data, null, 2));

    if (!data) {
      console.error('❌ Aucune donnée retournée');
      return {
        success: false,
        error: 'Aucune donnée retournée par le serveur'
      };
    }

    if (data.success === false) {
      console.error('❌ Échec de la soumission:', data.error);
      return {
        success: false,
        error: data.error || 'Erreur inconnue lors de la soumission'
      };
    }

    console.log('══════════════════════════════════════════');
    console.log('✅ SCORE CALCULÉ PAR SUPABASE');
    console.log('══════════════════════════════════════════');
    console.log('   Données brutes:', JSON.stringify(data, null, 2));
    console.log('   Submission ID:', data.submission_id);
    console.log('   Score:', data.score, '/', data.total);
    console.log('   Score Final:', data.score_final);
    console.log('   Correctes:', data.correct_count);
    console.log('   Incorrectes:', data.wrong_count);
    console.log('   Sans réponse:', data.unanswered_count);
    console.log('   Pourcentage:', data.percentage, '%');
    console.log('══════════════════════════════════════════');

    return {
      success: true,
      submissionId: data.submission_id,
      score: data.score,
      totalQuestions: data.total,
      correctCount: data.correct_count,
      wrongCount: data.wrong_count,
      unansweredCount: data.unanswered_count,
      percentage: data.percentage
    };

  } catch (err) {
    console.error('❌ Exception lors de la soumission:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inconnue'
    };
  }
}

/**
 * Récupère la correction complète d'une soumission
 */
export async function getCorrection(submissionId: string): Promise<CorrectionResult> {
  console.log('══════════════════════════════════════════');
  console.log('📥 RÉCUPÉRATION DE LA CORRECTION');
  console.log('══════════════════════════════════════════');
  console.log('   Submission ID:', submissionId);

  if (!isSupabaseConfigured || !supabase) {
    console.error('❌ Supabase non configuré');
    return {
      success: false,
      error: 'Supabase non configuré'
    };
  }

  try {
    // Appeler la fonction RPC get_correction
    console.log('🔄 Appel RPC get_correction...');
    
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_correction', {
      p_submission_id: submissionId
    });

    if (rpcError) {
      console.error('❌ Erreur RPC get_correction:', rpcError);
      return {
        success: false,
        error: `Erreur serveur: ${rpcError.message}`
      };
    }

    console.log('📥 Résultat brut de get_correction:', JSON.stringify(rpcData, null, 2));

    if (!rpcData) {
      console.error('❌ Aucune donnée retournée');
      return {
        success: false,
        error: 'Soumission introuvable'
      };
    }

    if (rpcData.success === false) {
      console.error('❌ Soumission non trouvée:', rpcData.error);
      return {
        success: false,
        error: rpcData.error || 'Soumission introuvable'
      };
    }

    // Extraire et normaliser les questions
    let questions: CorrectionQuestion[] = [];
    
    if (rpcData.questions && Array.isArray(rpcData.questions)) {
      questions = rpcData.questions.map((q: any) => normalizeQuestion(q));
      console.log('✅ Questions extraites:', questions.length);
      
      // Afficher un aperçu pour debug
      if (questions.length > 0) {
        console.log('   Aperçu question 1:');
        console.log('      ID:', questions[0].id);
        console.log('      Réponses utilisateur:', questions[0].user_answers);
        console.log('      Réponses correctes:', questions[0].correct_answers);
        console.log('      Est correct:', questions[0].is_correct);
        console.log('      Points:', questions[0].points);
      }
    } else {
      console.warn('⚠️ Aucune question trouvée dans la réponse');
    }

    console.log('══════════════════════════════════════════');
    console.log('✅ CORRECTION RÉCUPÉRÉE');
    console.log('══════════════════════════════════════════');
    console.log('   Candidat:', rpcData.candidate_name);
    console.log('   Concours:', rpcData.concours_name);
    console.log('   Score:', rpcData.score, '/', rpcData.total);
    console.log('   Questions:', questions.length);
    console.log('══════════════════════════════════════════');

    return {
      success: true,
      submissionId: rpcData.submission_id,
      candidateName: rpcData.candidate_name,
      candidatePhone: rpcData.candidate_phone,
      concoursId: rpcData.concours_id,
      concoursName: rpcData.concours_name,
      score: rpcData.score,
      scoreFinal: rpcData.score_final,
      totalQuestions: rpcData.total,
      correctCount: rpcData.correct_count,
      wrongCount: rpcData.wrong_count,
      unansweredCount: rpcData.unanswered_count,
      percentage: rpcData.percentage,
      proctoringPenalty: rpcData.proctoring_penalty || 0,
      proctoringAlerts: rpcData.proctoring_alerts || [],
      questions,
      createdAt: rpcData.created_at
    };

  } catch (err) {
    console.error('❌ Exception lors de la récupération:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inconnue'
    };
  }
}

/**
 * Normalise une question de correction (gère les différents formats de données)
 */
function normalizeQuestion(q: any): CorrectionQuestion {
  // Normaliser user_answers (peut être user_answers ou selectedOptions)
  let userAnswers: number[] = [];
  const rawUserAnswers = q.user_answers || q.selectedOptions || q.userAnswers || [];
  if (Array.isArray(rawUserAnswers)) {
    userAnswers = rawUserAnswers.map((a: any) => Number(a)).filter((n: number) => !isNaN(n));
  }

  // Normaliser correct_answers (peut être correct_answers ou correctAnswers)
  let correctAnswers: number[] = [];
  const rawCorrectAnswers = q.correct_answers || q.correctAnswers || [];
  if (Array.isArray(rawCorrectAnswers)) {
    correctAnswers = rawCorrectAnswers.map((a: any) => Number(a)).filter((n: number) => !isNaN(n));
  }

  // Normaliser options
  let options: string[] = [];
  if (Array.isArray(q.options)) {
    options = q.options.map((o: any) => String(o));
  }

  // Normaliser is_correct
  const isCorrect = q.is_correct === true || q.isCorrect === true;

  // Normaliser points
  const points = Number(q.points) || 0;

  return {
    id: Number(q.id || q.question_id || 0),
    question_text: String(q.question_text || q.questionText || q.question || ''),
    category_id: String(q.category_id || q.categoryId || q.category || ''),
    options,
    correct_answers: correctAnswers,
    user_answers: userAnswers,
    is_correct: isCorrect,
    points,
    has_latex: Boolean(q.has_latex || q.hasLatex),
    image_url: q.image_url || q.imageUrl || q.image || undefined,
    explanation: q.explanation || undefined // ← Explication détaillée
  };
}

/**
 * Génère l'URL de correction pour un submission ID
 */
export function generateCorrectionUrl(submissionId: string): string {
  const baseUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  return `${baseUrl}?correction=${submissionId}`;
}

/**
 * Vérifie si Supabase est disponible pour le calcul de score
 */
export function isScoreCalculationAvailable(): boolean {
  return isSupabaseConfigured && supabase !== null;
}

// ═══════════════════════════════════════════════════════════════════
// EXAMEN PERSONNALISÉ
// ═══════════════════════════════════════════════════════════════════

export interface CustomExamResult {
  success: boolean;
  error?: string;
  submissionId?: string;
  score?: number;
  total?: number;
  correctCount?: number;
  wrongCount?: number;
  unansweredCount?: number;
  percentage?: number;
  correction?: CorrectionQuestion[];
}

/**
 * Soumet un examen personnalisé à Supabase pour calcul du score côté serveur
 * Cette fonction est utilisée quand les questions viennent de plusieurs concours
 */
export async function submitCustomExam(params: {
  candidateName: string;
  candidatePhone: string;
  questionIds: number[];
  answers: QuizAnswer[];
}): Promise<CustomExamResult> {
  console.log('══════════════════════════════════════════');
  console.log('📤 SOUMISSION EXAMEN PERSONNALISÉ À SUPABASE');
  console.log('══════════════════════════════════════════');
  console.log('   Candidat:', params.candidateName);
  console.log('   Téléphone:', params.candidatePhone);
  console.log('   Questions:', params.questionIds.length);
  console.log('   Réponses:', params.answers.length);

  if (!isSupabaseConfigured || !supabase) {
    console.error('❌ Supabase non configuré');
    return {
      success: false,
      error: 'Supabase non configuré. Le calcul du score nécessite une connexion à Supabase.'
    };
  }

  try {
    const { data, error } = await supabase.rpc('submit_custom_exam', {
      p_candidate_name: params.candidateName,
      p_candidate_phone: params.candidatePhone,
      p_question_ids: params.questionIds,
      p_answers: params.answers
    });

    if (error) {
      console.error('❌ Erreur RPC submit_custom_exam:', error);
      return {
        success: false,
        error: `Erreur serveur: ${error.message}`
      };
    }

    console.log('📥 Résultat submit_custom_exam:', JSON.stringify(data, null, 2));

    if (!data || data.success === false) {
      return {
        success: false,
        error: data?.error || 'Erreur inconnue'
      };
    }

    // Normaliser les questions de correction
    const correction = data.correction ? data.correction.map((q: any) => normalizeQuestion(q)) : [];

    console.log('══════════════════════════════════════════');
    console.log('✅ EXAMEN PERSONNALISÉ - SCORE CALCULÉ');
    console.log('══════════════════════════════════════════');
    console.log('   Score:', data.score, '/', data.total);
    console.log('   Correctes:', data.correct_count);
    console.log('   Incorrectes:', data.wrong_count);
    console.log('   Sans réponse:', data.unanswered_count);
    console.log('══════════════════════════════════════════');

    return {
      success: true,
      submissionId: data.submission_id,
      score: data.score,
      total: data.total,
      correctCount: data.correct_count,
      wrongCount: data.wrong_count,
      unansweredCount: data.unanswered_count,
      percentage: data.percentage,
      correction
    };

  } catch (err) {
    console.error('❌ Exception submitCustomExam:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inconnue'
    };
  }
}
