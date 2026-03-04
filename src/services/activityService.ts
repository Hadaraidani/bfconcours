import { supabase, isSupabaseConfigured } from '../config/supabase';

// Types pour l'historique des activités
export interface QuizAttempt {
  id?: string;
  user_id: string;
  concours_name: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  duration_seconds: number;
  is_custom_exam: boolean;
  created_at?: string;
}

export interface UserStats {
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  totalTime: number;
  lastAttemptDate: string | null;
  favoriteCategory: string | null;
}

/**
 * Enregistrer une tentative de QCM
 */
export async function saveQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'created_at'>): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    // Sauvegarder localement si Supabase n'est pas configuré
    saveAttemptLocally(attempt);
    return { success: true, message: 'Tentative sauvegardée localement' };
  }

  try {
    const { error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: attempt.user_id,
        concours_name: attempt.concours_name,
        score: attempt.score,
        total_questions: attempt.total_questions,
        correct_answers: attempt.correct_answers,
        wrong_answers: attempt.wrong_answers,
        unanswered: attempt.unanswered,
        duration_seconds: attempt.duration_seconds,
        is_custom_exam: attempt.is_custom_exam,
      });

    if (error) {
      console.error('Erreur sauvegarde tentative:', error);
      // Sauvegarder localement en cas d'erreur
      saveAttemptLocally(attempt);
      return { success: false, message: 'Erreur de sauvegarde, données stockées localement' };
    }

    return { success: true, message: 'Tentative enregistrée avec succès' };
  } catch (error) {
    console.error('Erreur inattendue:', error);
    saveAttemptLocally(attempt);
    return { success: false, message: 'Erreur inattendue' };
  }
}

/**
 * Récupérer l'historique des tentatives d'un utilisateur
 */
export async function getUserAttempts(userId: string, limit: number = 10): Promise<QuizAttempt[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalAttempts(userId);
  }

  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erreur récupération tentatives:', error);
      return getLocalAttempts(userId);
    }

    return data || [];
  } catch (error) {
    console.error('Erreur inattendue:', error);
    return getLocalAttempts(userId);
  }
}

/**
 * Récupérer les statistiques d'un utilisateur
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  if (!isSupabaseConfigured || !supabase) {
    return calculateLocalStats(userId);
  }

  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) {
      return calculateLocalStats(userId);
    }

    const totalAttempts = data.length;
    const averageScore = data.reduce((sum, a) => sum + (a.score / a.total_questions) * 100, 0) / totalAttempts;
    const bestScore = Math.max(...data.map(a => (a.score / a.total_questions) * 100));
    const totalTime = data.reduce((sum, a) => sum + a.duration_seconds, 0);
    const lastAttempt = data[0];

    // Trouver le concours le plus fréquent
    const concoursCount: Record<string, number> = {};
    data.forEach(a => {
      if (!a.is_custom_exam) {
        concoursCount[a.concours_name] = (concoursCount[a.concours_name] || 0) + 1;
      }
    });
    const favoriteCategory = Object.entries(concoursCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
      totalAttempts,
      averageScore: Math.round(averageScore * 10) / 10,
      bestScore: Math.round(bestScore * 10) / 10,
      totalTime,
      lastAttemptDate: lastAttempt?.created_at || null,
      favoriteCategory,
    };
  } catch (error) {
    console.error('Erreur calcul statistiques:', error);
    return calculateLocalStats(userId);
  }
}

// ======================================
// Fonctions de stockage local (fallback)
// ======================================

function saveAttemptLocally(attempt: Omit<QuizAttempt, 'id' | 'created_at'>): void {
  try {
    const key = `quiz_attempts_${attempt.user_id}`;
    const existing = localStorage.getItem(key);
    const attempts: QuizAttempt[] = existing ? JSON.parse(existing) : [];
    
    attempts.unshift({
      ...attempt,
      id: `local_${Date.now()}`,
      created_at: new Date().toISOString(),
    });
    
    // Garder seulement les 50 dernières tentatives
    const trimmed = attempts.slice(0, 50);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Erreur sauvegarde locale:', error);
  }
}

function getLocalAttempts(userId: string): QuizAttempt[] {
  try {
    const key = `quiz_attempts_${userId}`;
    const existing = localStorage.getItem(key);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error('Erreur lecture locale:', error);
    return [];
  }
}

function calculateLocalStats(userId: string): UserStats {
  const attempts = getLocalAttempts(userId);
  
  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      bestScore: 0,
      totalTime: 0,
      lastAttemptDate: null,
      favoriteCategory: null,
    };
  }

  const totalAttempts = attempts.length;
  const averageScore = attempts.reduce((sum, a) => sum + (a.score / a.total_questions) * 100, 0) / totalAttempts;
  const bestScore = Math.max(...attempts.map(a => (a.score / a.total_questions) * 100));
  const totalTime = attempts.reduce((sum, a) => sum + a.duration_seconds, 0);

  const concoursCount: Record<string, number> = {};
  attempts.forEach(a => {
    if (!a.is_custom_exam) {
      concoursCount[a.concours_name] = (concoursCount[a.concours_name] || 0) + 1;
    }
  });
  const favoriteCategory = Object.entries(concoursCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    totalAttempts,
    averageScore: Math.round(averageScore * 10) / 10,
    bestScore: Math.round(bestScore * 10) / 10,
    totalTime,
    lastAttemptDate: attempts[0]?.created_at || null,
    favoriteCategory,
  };
}

/**
 * Formater la durée en heures/minutes/secondes
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m ${secs}s`;
}

/**
 * Formater la date relative (il y a X jours, etc.)
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? "A l'instant" : `Il y a ${diffMinutes} minutes`;
    }
    return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  }
  
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
  
  return date.toLocaleDateString('fr-FR');
}
