/**
 * DataProvider - Gère la source des données (Supabase ou Local)
 * 
 * MODE PRODUCTION : Utilise uniquement Supabase
 * MODE DÉVELOPPEMENT : Peut utiliser questions.ts si Supabase n'est pas configuré
 * 
 * SÉCURITÉ :
 * - En production, questions.ts n'est JAMAIS utilisé
 * - Les réponses correctes ne sont JAMAIS envoyées au frontend
 * - Le score est calculé côté serveur via Supabase RPC
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { Concours, Question, Category } from '../types';

// Import local uniquement pour le développement
// En production, ce code sera tree-shaken si non utilisé

// Fonction pour charger les données locales (uniquement en dev)
const loadLocalData = async (): Promise<Concours[]> => {
  if (import.meta.env.PROD) {
    // En production, ne jamais utiliser les données locales
    console.warn('⚠️ Tentative de chargement local en production - bloqué');
    return [];
  }
  
  try {
    // Import dynamique pour éviter d'inclure dans le bundle production
    const module = await import('../data/questions');
    return module.concoursData || [];
  } catch (error) {
    console.error('Erreur chargement données locales:', error);
    return [];
  }
};

// Types pour le contexte
interface QuestionWithoutAnswers extends Omit<Question, 'correctAnswers'> {
  id: number;
}

interface ConcoursPublic extends Omit<Concours, 'questions'> {
  questions: QuestionWithoutAnswers[];
  totalQuestions: number;
}

interface SubmitResult {
  success: boolean;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  submissionId: string;
  details: {
    questionId: number;
    isCorrect: boolean;
    userAnswers: number[];
    correctAnswers?: number[]; // Seulement après soumission pour la correction
  }[];
}

interface DataContextType {
  // État
  isLoading: boolean;
  error: string | null;
  dataSource: 'supabase' | 'local' | 'none';
  isProduction: boolean;
  
  // Données (sans réponses correctes)
  concours: ConcoursPublic[];
  
  // Actions
  loadConcours: () => Promise<void>;
  getConcoursById: (id: string) => ConcoursPublic | undefined;
  submitQuiz: (
    concoursId: string,
    answers: { questionId: number; selectedOptions: number[] }[],
    userInfo: { fullName: string; phone: string; email?: string }
  ) => Promise<SubmitResult>;
  getCorrection: (submissionId: string) => Promise<any>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Hook pour utiliser le DataProvider
export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData doit être utilisé dans un DataProvider');
  }
  return context;
};

// Provider
interface DataProviderProps {
  children: React.ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'local' | 'none'>('none');
  const [concours, setConcours] = useState<ConcoursPublic[]>([]);
  
  const isProduction = import.meta.env.PROD;
  const isSupabaseConfigured = !!supabase;

  // Charger les concours depuis Supabase (sans réponses correctes)
  const loadFromSupabase = useCallback(async (): Promise<ConcoursPublic[]> => {
    if (!supabase) {
      throw new Error('Supabase non configuré');
    }

    // 1. Charger les concours
    const { data: concoursData, error: concoursError } = await supabase!
      .from('concours')
      .select('*')
      .eq('available', true)
      .order('name');

    if (concoursError) throw concoursError;
    if (!concoursData || concoursData.length === 0) {
      return [];
    }

    // 2. Pour chaque concours, charger les catégories et questions (SANS réponses)
    const concoursWithQuestions: ConcoursPublic[] = await Promise.all(
      concoursData.map(async (c) => {
        // Charger les catégories du concours
        const { data: categoriesData } = await supabase!
          .from('concours_categories')
          .select(`
            category_id,
            questions_count,
            display_order,
            categories (id, name, name_short)
          `)
          .eq('concours_id', c.id)
          .order('display_order');

        // Charger les questions SANS les réponses correctes (vue sécurisée)
        const { data: questionsData } = await supabase!
          .from('questions_public') // Vue qui exclut correct_answers
          .select('*')
          .eq('concours_id', c.id)
          .order('id');

        const categories = (categoriesData || []).map((cc: any) => ({
          id: cc.categories.id as Category,
          name: cc.categories.name,
          nameShort: cc.categories.name_short,
          questionsCount: cc.questions_count,
        }));

        const questions: QuestionWithoutAnswers[] = (questionsData || []).map((q: any) => ({
          id: q.id,
          category: q.category_id as Category,
          question: q.question_text,
          options: q.options,
          hasLatex: q.has_latex || false,
          image: q.image_url,
          // PAS de correctAnswers ici !
        }));

        return {
          id: c.id,
          name: c.name,
          description: c.description,
          icon: c.icon,
          duration: c.duration,
          available: c.available,
          categories,
          questions,
          totalQuestions: questions.length,
        };
      })
    );

    return concoursWithQuestions;
  }, []);

  // Charger les données locales (uniquement en développement)
  const loadFromLocal = useCallback(async (): Promise<ConcoursPublic[]> => {
    if (isProduction) {
      console.warn('⚠️ Chargement local bloqué en production');
      return [];
    }

    const localConcours = await loadLocalData();
    
    // Convertir en format public (sans réponses en mode sécurisé)
    // En dev local, on garde les réponses pour tester
    return localConcours.map(c => ({
      ...c,
      totalQuestions: c.questions.length,
      questions: c.questions.map(q => ({
        id: q.id,
        category: q.category,
        question: q.question,
        options: q.options,
        hasLatex: q.hasLatex,
        image: q.image,
        // En dev, on garde les réponses pour tester
        // correctAnswers est disponible mais ne sera pas utilisé côté client
      })),
    }));
  }, [isProduction]);

  // Fonction principale de chargement
  const loadConcours = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // En production, on utilise UNIQUEMENT Supabase
      if (isProduction) {
        if (!isSupabaseConfigured) {
          setError('Configuration Supabase manquante');
          setDataSource('none');
          setConcours([]);
          return;
        }

        const data = await loadFromSupabase();
        if (data.length === 0) {
          setError('Aucun concours disponible. Veuillez exécuter la migration.');
          setDataSource('none');
        } else {
          setConcours(data);
          setDataSource('supabase');
        }
        return;
      }

      // En développement, essayer Supabase d'abord, puis local
      if (isSupabaseConfigured) {
        try {
          const data = await loadFromSupabase();
          if (data.length > 0) {
            setConcours(data);
            setDataSource('supabase');
            console.log('✅ Données chargées depuis Supabase');
            return;
          }
        } catch (e) {
          console.warn('⚠️ Supabase indisponible, passage en mode local');
        }
      }

      // Fallback local (dev uniquement)
      const localData = await loadFromLocal();
      if (localData.length > 0) {
        setConcours(localData);
        setDataSource('local');
        console.log('📁 Données chargées depuis questions.ts (dev)');
      } else {
        setError('Aucune donnée disponible');
        setDataSource('none');
      }
    } catch (e: any) {
      console.error('Erreur chargement données:', e);
      setError(e.message || 'Erreur de chargement');
      setDataSource('none');
    } finally {
      setIsLoading(false);
    }
  }, [isProduction, isSupabaseConfigured, loadFromSupabase, loadFromLocal]);

  // Obtenir un concours par ID
  const getConcoursById = useCallback((id: string): ConcoursPublic | undefined => {
    return concours.find(c => c.id === id);
  }, [concours]);

  // Soumettre un quiz (calcul du score côté serveur)
  const submitQuiz = useCallback(async (
    concoursId: string,
    answers: { questionId: number; selectedOptions: number[] }[],
    userInfo: { fullName: string; phone: string; email?: string }
  ): Promise<SubmitResult> => {
    // En production, TOUJOURS utiliser Supabase RPC
    if (isProduction || (isSupabaseConfigured && dataSource === 'supabase')) {
      if (!supabase) {
        throw new Error('Supabase non configuré');
      }

      // Appeler la fonction RPC sécurisée
      const { data, error } = await supabase.rpc('submit_quiz', {
        p_concours_id: concoursId,
        p_answers: answers,
        p_user_name: userInfo.fullName,
        p_user_phone: userInfo.phone,
        p_user_email: userInfo.email || null,
      });

      if (error) throw error;
      return data as SubmitResult;
    }

    // En développement local, calculer le score localement
    // Ceci ne sera JAMAIS exécuté en production
    const localConcours = await loadLocalData();
    const selectedConcours = localConcours.find(c => c.id === concoursId);
    
    if (!selectedConcours) {
      throw new Error('Concours non trouvé');
    }

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    const details: SubmitResult['details'] = [];

    for (const question of selectedConcours.questions) {
      const answer = answers.find(a => a.questionId === question.id);
      const userAnswers = answer?.selectedOptions || [];
      const correctAnswers = question.correctAnswers;

      let isCorrect = false;
      
      if (userAnswers.length === 0) {
        unansweredCount++;
      } else {
        // Vérifier si les réponses sont exactement correctes
        const sortedUser = [...userAnswers].sort();
        const sortedCorrect = [...correctAnswers].sort();
        isCorrect = sortedUser.length === sortedCorrect.length &&
                    sortedUser.every((v, i) => v === sortedCorrect[i]);
        
        if (isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }

      details.push({
        questionId: question.id,
        isCorrect,
        userAnswers,
        correctAnswers, // Inclus en dev pour la correction
      });
    }

    const score = correctCount - wrongCount;
    const submissionId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      score,
      totalQuestions: selectedConcours.questions.length,
      correctCount,
      wrongCount,
      unansweredCount,
      submissionId,
      details,
    };
  }, [isProduction, isSupabaseConfigured, dataSource]);

  // Obtenir la correction (après soumission)
  const getCorrection = useCallback(async (submissionId: string) => {
    if (!supabase) {
      throw new Error('Supabase non configuré');
    }

    const { data, error } = await supabase.rpc('get_correction', {
      p_submission_id: submissionId,
    });

    if (error) throw error;
    return data;
  }, []);

  // Rafraîchir les données
  const refreshData = useCallback(async () => {
    await loadConcours();
  }, [loadConcours]);

  // Charger les données au montage
  useEffect(() => {
    loadConcours();
  }, [loadConcours]);

  const value: DataContextType = {
    isLoading,
    error,
    dataSource,
    isProduction,
    concours,
    loadConcours,
    getConcoursById,
    submitQuiz,
    getCorrection,
    refreshData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataProvider;
