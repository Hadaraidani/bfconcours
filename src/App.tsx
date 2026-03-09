import { useState, useEffect } from 'react';
import { Theme, UserInfo, Concours, UserAnswer, QuizResult, Category, Question } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HeroBackground } from './components/HeroBackground';
import { UserForm } from './components/UserForm';
import { ConcoursSelection } from './components/ConcoursSelection';
import { CustomExamGenerator } from './components/CustomExamGenerator';
import { QuizPage } from './components/QuizPage';
import { ResultPage } from './components/ResultPage';
import { CorrectionPage } from './components/CorrectionPage';
import { LoginPage, RegisterPage, UserProfile as UserProfileComponent } from './components/auth';
import { useAuth } from './contexts/AuthContext';
import { SITE_CONFIG } from './config/site';
import { saveQuizAttempt } from './services/activityService';
import { supabase, isSupabaseConfigured } from './config/supabase';
import { submitQuiz, submitCustomExam, QuizAnswer } from './services/quizService';
// Système de codes d'accès
import AccessCodeModal from './components/AccessCodeModal';
import AdminDashboard from './components/AdminDashboard';
import { clearStoredAccessCode } from './services/accessCodeService';
// Fallback local si Supabase n'est pas configuré (uniquement en développement)
import { concoursData as localConcoursData } from './data/questions';

// ═══════════════════════════════════════════════════════════════════
// CALCUL LOCAL DU SCORE (pour examens personnalisés ou fallback)
// ═══════════════════════════════════════════════════════════════════

function calculateScoreLocally(
  answers: UserAnswer[],
  questions: Question[]
): {
  score: number;
  bonnesReponses: number;
  mauvaisesReponses: number;
  sansReponse: number;
  enrichedAnswers: UserAnswer[];
} {
  let score = 0;
  let bonnesReponses = 0;
  let mauvaisesReponses = 0;
  let sansReponse = 0;

  const enrichedAnswers: UserAnswer[] = questions.map((question) => {
    const userAnswer = answers.find((a) => a.questionId === question.id);
    const selectedOptions = userAnswer?.selectedOptions || [];
    const correctOptions = question.correctAnswers;

    let isCorrect = false;
    let points = 0;

    if (selectedOptions.length === 0) {
      sansReponse++;
      points = 0;
    } else {
      // Vérifier si les réponses sont exactement les mêmes
      const sortedSelected = [...selectedOptions].sort();
      const sortedCorrect = [...correctOptions].sort();
      isCorrect =
        sortedSelected.length === sortedCorrect.length &&
        sortedSelected.every((val, idx) => val === sortedCorrect[idx]);

      if (isCorrect) {
        bonnesReponses++;
        points = 1;
        score++;
      } else {
        mauvaisesReponses++;
        points = -1;
        score--;
      }
    }

    return {
      questionId: question.id,
      selectedOptions,
      correctOptions,
      isCorrect,
      points,
    };
  });

  return {
    score,
    bonnesReponses,
    mauvaisesReponses,
    sansReponse,
    enrichedAnswers,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CHARGEMENT DES CONCOURS DEPUIS SUPABASE
// ═══════════════════════════════════════════════════════════════════

const loadConcoursFromSupabase = async (): Promise<{ success: boolean; data: Concours[]; error?: string }> => {
  if (!supabase) {
    return { success: false, data: [], error: 'Supabase non configuré' };
  }

  try {
    // Charger les concours
    const { data: concoursData, error: concoursError } = await supabase
      .from('concours')
      .select('*')
      .order('name');

    if (concoursError) {
      console.error('Erreur chargement concours:', concoursError);
      return { success: false, data: [], error: concoursError.message };
    }

    if (!concoursData || concoursData.length === 0) {
      console.log('Aucun concours trouvé dans Supabase');
      return { success: true, data: [] };
    }

    console.log(`${concoursData.length} concours trouvés dans Supabase`);

    // Pour chaque concours, charger les catégories et questions
    const fullConcours: Concours[] = await Promise.all(
      concoursData.map(async (c) => {
        // Charger les catégories
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

        // Charger les questions via la vue questions_public (SANS correct_answers)
        const { data: questionsData, error: questionsError } = await supabase!
          .from('questions_public')
          .select('*')
          .eq('concours_id', c.id)
          .order('id', { ascending: true });

        if (questionsError) {
          console.warn(`Erreur questions pour ${c.id}:`, questionsError);
        }

        const categories = (categoriesData || []).map((cc: any) => ({
          id: cc.categories?.id as Category || cc.category_id,
          name: cc.categories?.name || cc.category_id,
          nameShort: cc.categories?.name_short,
          questionsCount: cc.questions_count,
        }));

        // ⚠️ IMPORTANT: Les questions n'incluent PAS correctAnswers (sécurité)
        const questions = (questionsData || []).map((q: any) => ({
          id: q.id,
          category: (q.category_id || q.category) as Category,
          question: q.question_text || q.question,
          options: q.options,
          correctAnswers: [], // ⚠️ TOUJOURS VIDE - Le calcul se fait côté serveur
          hasLatex: q.has_latex || false,
          image: q.image_url,
        }));

        console.log(`  - ${c.name}: ${questions.length} questions, ${categories.length} catégories`);

        return {
          id: c.id,
          name: c.name,
          description: c.description,
          icon: c.icon,
          duration: c.duration,
          available: c.available,
          categories,
          questions,
        };
      })
    );

    return { success: true, data: fullConcours };
  } catch (error: any) {
    console.error('Erreur globale chargement Supabase:', error);
    return { success: false, data: [], error: error.message };
  }
};

// ═══════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

type AppStep = 'home' | 'login' | 'register' | 'userForm' | 'concoursSelection' | 'customExam' | 'quiz' | 'result' | 'correction';

export function App() {
  const { user, userProfile, signOut, loading: authLoading, isConfigured: authConfigured } = useAuth();
  
  const [theme, setTheme] = useState<Theme>(SITE_CONFIG.defaultTheme);
  const [step, setStep] = useState<AppStep>('home');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [selectedConcours, setSelectedConcours] = useState<Concours | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  // État pour les données chargées depuis Supabase
  const [concoursData, setConcoursData] = useState<Concours[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'local'>('local');

  // État pour l'ID de correction
  const [correctionId, setCorrectionId] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════
  // SYSTÈME DE CODES D'ACCÈS
  // ═══════════════════════════════════════════════════════════════════
  const [requireAccessCode] = useState(true); // Mettre à false pour désactiver
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
  const [accessCodeValidated, setAccessCodeValidated] = useState(false);
  const [showAdminPage, setShowAdminPage] = useState(false);
  const [validatedConcoursId, setValidatedConcoursId] = useState<string | null>(null);

  // Charger les données au démarrage
  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      setDataError(null);

      if (isSupabaseConfigured) {
        const result = await loadConcoursFromSupabase();
        
        if (result.success && result.data.length > 0) {
          setConcoursData(result.data);
          setDataSource('supabase');
          console.log('✅ Données chargées depuis Supabase:', result.data.length, 'concours');
        } else {
          console.warn('⚠️ Supabase vide ou erreur, utilisation des données locales');
          console.warn('Erreur:', result.error);
          setConcoursData(localConcoursData);
          setDataSource('local');
          if (result.error) {
            setDataError(result.error);
          }
        }
      } else {
        console.log('ℹ️ Supabase non configuré, utilisation des données locales');
        setConcoursData(localConcoursData);
        setDataSource('local');
      }

      setDataLoading(false);
    }

    loadData();
  }, []);

  // Vérifier si on accède via un lien de correction
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const correctionParam = urlParams.get('correction');
    const authParam = urlParams.get('auth');
    
    if (correctionParam) {
      setCorrectionId(correctionParam);
      setStep('correction');
    } else if (authParam === 'login') {
      setStep('login');
    } else if (authParam === 'register') {
      setStep('register');
    }
  }, []);

  // Pré-remplir le formulaire utilisateur si connecté
  useEffect(() => {
    if (user && userProfile) {
      setUserInfo({
        nom: userProfile.full_name.split(' ')[0] || '',
        prenom: userProfile.full_name.split(' ').slice(1).join(' ') || '',
        telephone: userProfile.phone || '',
      });
    }
  }, [user, userProfile]);

  // Raccourci clavier pour accéder à l'administration des codes (Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowAdminPage(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ═════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═════════════════════════════════════════════════════════════════

  const handleStartClick = () => {
    // Si les codes d'accès sont requis et non validés, afficher le modal
    if (requireAccessCode && !accessCodeValidated) {
      setShowAccessCodeModal(true);
      return;
    }
    
    if (user && userProfile) {
      setUserInfo({
        nom: userProfile.full_name.split(' ')[0] || '',
        prenom: userProfile.full_name.split(' ').slice(1).join(' ') || '',
        telephone: userProfile.phone || '',
      });
      setStep('concoursSelection');
    } else {
      setStep('userForm');
    }
  };

  // Gestionnaire de validation du code d'accès
  const handleAccessCodeValidated = (result: { concoursId?: string | null }) => {
    setAccessCodeValidated(true);
    setShowAccessCodeModal(false);
    
    // Si le code est lié à un concours spécifique, le sélectionner directement
    if (result.concoursId) {
      setValidatedConcoursId(result.concoursId);
      const linkedConcours = concoursData.find(c => c.id === result.concoursId);
      if (linkedConcours) {
        // Aller directement au QCM après le formulaire utilisateur
        setSelectedConcours(linkedConcours);
      }
    }
    
    // Continuer vers le formulaire ou la sélection de concours
    if (user && userProfile) {
      setUserInfo({
        nom: userProfile.full_name.split(' ')[0] || '',
        prenom: userProfile.full_name.split(' ').slice(1).join(' ') || '',
        telephone: userProfile.phone || '',
      });
      // Si le concours est pré-sélectionné, aller au formulaire puis au quiz
      setStep(validatedConcoursId ? 'userForm' : 'concoursSelection');
    } else {
      setStep('userForm');
    }
  };

  const handleLoginClick = () => {
    if (authConfigured) {
      setStep('login');
    } else {
      alert('L\'authentification n\'est pas configurée. Veuillez configurer Supabase.');
    }
  };

  const handleLogoutClick = async () => {
    try {
      await signOut();
      setUserInfo(null);
      setStep('home');
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  const handleUserSubmit = (info: UserInfo) => {
    setUserInfo(info);
    setStep('concoursSelection');
  };

  const handleConcoursSelect = (concours: Concours) => {
    setSelectedConcours(concours);
    setStep('quiz');
  };

  const handleGenerateCustom = () => {
    setStep('customExam');
  };

  const handleCustomExamGenerate = (concours: Concours) => {
    // Pour les examens personnalisés, on utilise les données LOCALES
    // car elles contiennent les correctAnswers nécessaires au calcul du score
    // (les données Supabase ne les contiennent pas pour des raisons de sécurité)
    setSelectedConcours({ ...concours, id: 'custom-exam' });
    setStep('quiz');
  };

  // ═════════════════════════════════════════════════════════════════
  // SOUMISSION DU QUIZ
  // ═════════════════════════════════════════════════════════════════

  const handleQuizSubmit = async (answers: UserAnswer[], duration: number, proctoringData?: any) => {
    if (!userInfo || !selectedConcours) return;
    
    // Calculer la pénalité de proctoring
    let proctoringPenalty = 0;
    if (proctoringData) {
      console.log('📊 Données de proctoring:', proctoringData);
      proctoringPenalty = proctoringData.totalPointsPenalty || 0;
      console.log(`🔒 Pénalité de proctoring: ${proctoringPenalty} points`);
    }

    const isCustomExam = selectedConcours.id === 'custom-exam';
    
    // ═══════════════════════════════════════════════════════════════
    // EXAMENS OFFICIELS AVEC SUPABASE : Calcul côté serveur
    // ═══════════════════════════════════════════════════════════════
    if (!isCustomExam && isSupabaseConfigured && dataSource === 'supabase') {
      console.log('📤 Soumission sécurisée via Supabase RPC...');
      
      // Convertir les réponses au format attendu par la fonction RPC
      const quizAnswers: QuizAnswer[] = answers.map(a => ({
        question_id: a.questionId,
        selected_options: a.selectedOptions
      }));

      // Préparer les alertes de proctoring pour Supabase
      const proctoringAlerts = proctoringData?.penaltySummary?.map((item: any) => ({
        type: item.category,
        count: item.count,
        totalPoints: item.totalPoints
      })) || [];

      const submitResult = await submitQuiz({
        concoursId: selectedConcours.id,
        candidateName: `${userInfo.nom} ${userInfo.prenom}`,
        candidatePhone: userInfo.telephone,
        answers: quizAnswers,
        proctoringPenalty: proctoringPenalty,
        proctoringAlerts: proctoringAlerts,
      });
      
      if (submitResult.success && submitResult.submissionId) {
        console.log('✅ Score calculé par Supabase:', submitResult.score, '/', submitResult.totalQuestions);

        // Score de base = score des réponses (calculé par Supabase)
        const scoreReponses = submitResult.score || 0;
        
        // Pénalité de proctoring (valeur négative, ex: -5)
        // On prend la valeur absolue pour la soustraction
        const penaliteAbsolue = Math.abs(proctoringPenalty);
        
        // Score final = Score des réponses - Pénalité de surveillance
        const scoreFinal = Math.max(0, scoreReponses - penaliteAbsolue);
        
        console.log(`📊 Score réponses: ${scoreReponses}, Pénalité: ${penaliteAbsolue}, Score final: ${scoreFinal}`);

        // Construire le résultat (sans les détails de correction - ils seront chargés via le lien)
        const result: QuizResult = {
          user: userInfo,
          concours: selectedConcours.name,
          answers: answers.map(a => ({
            questionId: a.questionId,
            selectedOptions: a.selectedOptions,
            correctOptions: [], // Sera rempli par la page de correction
            isCorrect: false,
            points: 0,
          })),
          score: scoreReponses, // Score des réponses (avant pénalités)
          scoreFinal: scoreFinal, // Score final (après pénalités de surveillance)
          totalQuestions: submitResult.totalQuestions || selectedConcours.questions.length,
          bonnesReponses: submitResult.correctCount || 0,
          mauvaisesReponses: submitResult.wrongCount || 0,
          sansReponse: submitResult.unansweredCount || 0,
          duration,
          submittedAt: new Date(),
          isCustomExam: false,
          questions: selectedConcours.questions,
          submissionId: submitResult.submissionId,
          proctoringData: proctoringData, // Ajouter les données de proctoring
        };

        // Enregistrer la tentative dans l'historique si connecté
        if (user) {
          saveQuizAttempt({
            user_id: user.id,
            concours_name: selectedConcours.name,
            score: submitResult.score || 0,
            total_questions: submitResult.totalQuestions || selectedConcours.questions.length,
            correct_answers: submitResult.correctCount || 0,
            wrong_answers: submitResult.wrongCount || 0,
            unanswered: submitResult.unansweredCount || 0,
            duration_seconds: duration,
            is_custom_exam: false,
          }).catch(err => console.error('Erreur sauvegarde tentative:', err));
        }

        setQuizResult(result);
        setStep('result');
        return;
      } else {
        console.error('❌ Erreur soumission Supabase:', submitResult.error);
        // En cas d'erreur, on ne fait PAS de fallback local pour les examens officiels
        // Cela garantit la sécurité (pas de calcul côté client)
        alert('Erreur lors de la soumission. Veuillez réessayer.');
        return;
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // EXAMENS PERSONNALISÉS : Essayer Supabase d'abord, sinon local
    // ═══════════════════════════════════════════════════════════════
    if (isCustomExam) {
      // Essayer d'abord avec Supabase si configuré
      if (isSupabaseConfigured && supabase) {
        console.log('📤 Soumission examen personnalisé via Supabase RPC...');
        
        const questionIds = selectedConcours.questions.map(q => q.id);
        const formattedAnswers: QuizAnswer[] = answers.map(a => ({
          question_id: a.questionId,
          selected_options: a.selectedOptions
        }));

        const customResult = await submitCustomExam({
          candidateName: `${userInfo.nom} ${userInfo.prenom}`,
          candidatePhone: userInfo.telephone,
          questionIds,
          answers: formattedAnswers
        });

        if (customResult.success) {
          console.log('✅ Score calculé par Supabase:', customResult.score, '/', customResult.total);

          // Construire les questions avec les corrections de Supabase
          const questionsWithCorrection = customResult.correction?.map(c => ({
            id: c.id,
            question: c.question_text,
            options: c.options,
            correctAnswers: c.correct_answers,
            category: c.category_id as Category,
            hasLatex: c.has_latex,
            image: c.image_url
          })) || selectedConcours.questions;

          // Construire les réponses enrichies
          const enrichedAnswers = answers.map(a => {
            const correctionItem = customResult.correction?.find(c => c.id === a.questionId);
            return {
              questionId: a.questionId,
              selectedOptions: a.selectedOptions,
              correctOptions: correctionItem?.correct_answers || [],
              isCorrect: correctionItem?.is_correct || false,
              points: correctionItem?.is_correct ? 1 : (a.selectedOptions.length > 0 ? -1 : 0)
            };
          });

          const result: QuizResult = {
            user: userInfo,
            concours: selectedConcours.name,
            answers: enrichedAnswers,
            score: customResult.score || 0,
            totalQuestions: customResult.total || selectedConcours.questions.length,
            bonnesReponses: customResult.correctCount || 0,
            mauvaisesReponses: customResult.wrongCount || 0,
            sansReponse: customResult.unansweredCount || 0,
            duration,
            submittedAt: new Date(),
            isCustomExam: true,
            questions: questionsWithCorrection,
            submissionId: customResult.submissionId,
          };

          // Enregistrer la tentative dans l'historique si connecté
          if (user) {
            saveQuizAttempt({
              user_id: user.id,
              concours_name: selectedConcours.name,
              score: customResult.score || 0,
              total_questions: customResult.total || selectedConcours.questions.length,
              correct_answers: customResult.correctCount || 0,
              wrong_answers: customResult.wrongCount || 0,
              unanswered: customResult.unansweredCount || 0,
              duration_seconds: duration,
              is_custom_exam: true,
            }).catch(err => console.error('Erreur sauvegarde tentative:', err));
          }

          setQuizResult(result);
          setStep('result');
          return;
        } else {
          console.warn('⚠️ Erreur Supabase pour examen personnalisé, fallback local:', customResult.error);
        }
      }

      // Fallback : calcul local si Supabase échoue ou n'est pas configuré
      console.log('📊 Calcul du score local pour examen personnalisé...');
      
      const localResult = calculateScoreLocally(answers, selectedConcours.questions);

      const result: QuizResult = {
        user: userInfo,
        concours: selectedConcours.name,
        answers: localResult.enrichedAnswers,
        score: localResult.score,
        totalQuestions: selectedConcours.questions.length,
        bonnesReponses: localResult.bonnesReponses,
        mauvaisesReponses: localResult.mauvaisesReponses,
        sansReponse: localResult.sansReponse,
        duration,
        submittedAt: new Date(),
        isCustomExam: true,
        questions: selectedConcours.questions,
      };

      // Enregistrer la tentative dans l'historique si connecté
      if (user) {
        saveQuizAttempt({
          user_id: user.id,
          concours_name: selectedConcours.name,
          score: localResult.score,
          total_questions: selectedConcours.questions.length,
          correct_answers: localResult.bonnesReponses,
          wrong_answers: localResult.mauvaisesReponses,
          unanswered: localResult.sansReponse,
          duration_seconds: duration,
          is_custom_exam: true,
        }).catch(err => console.error('Erreur sauvegarde tentative:', err));
      }

      setQuizResult(result);
      setStep('result');
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // MODE LOCAL (développement) : Calcul local
    // ═══════════════════════════════════════════════════════════════
    console.log('📊 Mode local - Calcul du score...');
    
    const localResult = calculateScoreLocally(answers, selectedConcours.questions);

    const result: QuizResult = {
      user: userInfo,
      concours: selectedConcours.name,
      answers: localResult.enrichedAnswers,
      score: localResult.score,
      totalQuestions: selectedConcours.questions.length,
      bonnesReponses: localResult.bonnesReponses,
      mauvaisesReponses: localResult.mauvaisesReponses,
      sansReponse: localResult.sansReponse,
      duration,
      submittedAt: new Date(),
      isCustomExam,
      questions: selectedConcours.questions,
    };

    setQuizResult(result);
    setStep('result');
  };

  const handleRestart = () => {
    setStep('home');
    setSelectedConcours(null);
    setQuizResult(null);
    setCorrectionId(null);
    // Réinitialiser le code d'accès
    setAccessCodeValidated(false);
    setValidatedConcoursId(null);
    clearStoredAccessCode();
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleAuthSuccess = () => {
    setStep('home');
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const getThemeButtonClass = () => {
    switch (theme) {
      case 'blue': return 'bg-blue-600 hover:bg-blue-700';
      case 'purple': return 'bg-purple-600 hover:bg-purple-700';
      case 'orange': return 'bg-orange-600 hover:bg-orange-700';
      case 'red': return 'bg-red-600 hover:bg-red-700';
      default: return 'bg-emerald-600 hover:bg-emerald-700';
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // AFFICHAGE DU CHARGEMENT
  // ═════════════════════════════════════════════════════════════════

  if (dataLoading || (authConfigured && authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-yellow-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto border-green-600"></div>
          <p className="mt-4 text-gray-600">Chargement des données...</p>
          <p className="text-sm mt-2 text-gray-400">
            {dataLoading ? 'Connexion à la base de données...' : 'Vérification de l\'authentification...'}
          </p>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // PAGES D'AUTHENTIFICATION
  // ═════════════════════════════════════════════════════════════════

  const ProfileModal = showProfile && user ? (
    <UserProfileComponent onClose={() => setShowProfile(false)} />
  ) : null;

  if (step === 'login') {
    return (
      <LoginPage
        onSwitchToRegister={() => setStep('register')}
        onBack={() => setStep('home')}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  if (step === 'register') {
    return (
      <RegisterPage
        onSwitchToLogin={() => setStep('login')}
        onBack={() => setStep('home')}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // PAGE DE CORRECTION
  // ═════════════════════════════════════════════════════════════════

  if (step === 'correction' && correctionId) {
    return (
      <CorrectionPage
        submissionId={correctionId}
        onGoHome={handleRestart}
      />
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // PAGE D'ACCUEIL
  // ═════════════════════════════════════════════════════════════════

  if (step === 'home') {
    const availableConcours = concoursData.filter(c => c.available);
    const totalQuestions = availableConcours.reduce((sum, c) => sum + c.questions.length, 0);
    const allCategories = new Set<string>();
    availableConcours.forEach(c => c.categories.forEach(cat => allCategories.add(cat.id)));
    const totalMatieres = allCategories.size;
    const avgDuration = availableConcours.length > 0 
      ? Math.round(availableConcours.reduce((sum, c) => sum + c.duration, 0) / availableConcours.length)
      : 90;

    return (
      <div className="flex flex-col min-h-screen relative">
        <HeroBackground />
        {ProfileModal}
        
        {/* Modal de code d'accès */}
        {showAccessCodeModal && (
          <AccessCodeModal
            onValidated={handleAccessCodeValidated}
            onCancel={() => setShowAccessCodeModal(false)}
          />
        )}
        
        {/* Page d'administration (Ctrl+Shift+A) */}
        {showAdminPage && (
          <AdminDashboard onClose={() => setShowAdminPage(false)} />
        )}
        
        <Header 
          theme={theme} 
          onThemeChange={setTheme}
          showThemeSelector={SITE_CONFIG.allowThemeChange}
          isAuthenticated={!!user}
          userName={userProfile?.full_name}
          onLoginClick={handleLoginClick}
          onLogoutClick={handleLogoutClick}
          onProfileClick={() => setShowProfile(true)}
        />
        
        <main className="flex-1 py-8 sm:py-16 px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Indicateur de source des données */}
            {dataSource === 'supabase' && (
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Données en ligne - Score sécurisé</span>
                </div>
              </div>
            )}
            
            {dataSource === 'local' && (
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  <span>Mode local (développement)</span>
                </div>
              </div>
            )}
            
            {dataError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
                <p className="text-yellow-800 text-sm">
                  <strong>Note :</strong> {dataError}
                </p>
                <p className="text-yellow-600 text-xs mt-1">
                  Utilisation des données locales en attendant.
                </p>
              </div>
            )}

            {/* Message de bienvenue si connecté */}
            {user && userProfile && (
              <div className="rounded-xl p-4 mb-8 max-w-2xl mx-auto border bg-green-50 border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-green-500">
                    {userProfile.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-green-800">
                      Bienvenue, {userProfile.full_name} !
                    </p>
                    <p className="text-sm text-green-600">
                      Vous êtes connecté et prêt à passer vos QCM.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Hero Section */}
            <div className="text-center mb-10 sm:mb-16">
              <div className="inline-flex items-center space-x-2 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border mb-6 bg-white/80 border-gray-100">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium text-gray-600">Plateforme officielle de préparation</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-gray-800">
                Préparez vos
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">
                  Concours Directs
                </span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 text-gray-600">
                Entraînez-vous avec des QCM de qualité et maximisez vos chances de réussite aux concours du Burkina Faso.
              </p>

              {/* Statistiques rapides */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8">
                <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-sm">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-gray-800">{totalQuestions}</p>
                    <p className="text-xs text-gray-500">Questions</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-sm">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-gray-800">{totalMatieres}</p>
                    <p className="text-xs text-gray-500">Matières</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-sm">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-gray-800">{availableConcours.length}</p>
                    <p className="text-xs text-gray-500">Concours</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-sm">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-gray-800">{avgDuration}</p>
                    <p className="text-xs text-gray-500">Min (moy.)</p>
                  </div>
                </div>
              </div>

              {/* Boutons CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleStartClick}
                  className={`${getThemeButtonClass()} text-white font-bold text-lg sm:text-xl px-8 sm:px-12 py-4 sm:py-5 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all inline-flex items-center space-x-3`}
                >
                  <span>Commencer le QCM</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>

                {!user && authConfigured && (
                  <button
                    onClick={() => setStep('register')}
                    className="bg-white text-gray-700 font-semibold text-lg px-8 py-4 rounded-2xl shadow-md hover:shadow-lg border border-gray-200 hover:border-gray-300 transition-all inline-flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span>Créer un compte</span>
                  </button>
                )}
              </div>
            </div>

            {/* Système de notation */}
            <div className="mb-12 sm:mb-16">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-2xl mx-auto">
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-5">
                  <h2 className="text-lg sm:text-xl font-bold text-white text-center">
                    Comment fonctionne la notation ?
                  </h2>
                </div>
                
                <div className="p-6 sm:p-8">
                  <div className="text-center mb-6">
                    <p className="text-gray-600 text-sm sm:text-base">
                      Votre score est calculé automatiquement selon vos réponses :
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6 mb-6">
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="py-3 sm:py-4">
                            <div className="flex items-center space-x-3">
                              <span className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                              <span className="text-sm sm:text-base text-gray-700">Réponse correcte</span>
                            </div>
                          </td>
                          <td className="py-3 sm:py-4 text-right">
                            <span className="text-xl sm:text-2xl font-bold text-green-600">+1</span>
                          </td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="py-3 sm:py-4">
                            <div className="flex items-center space-x-3">
                              <span className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </span>
                              <span className="text-sm sm:text-base text-gray-700">Réponse incorrecte</span>
                            </div>
                          </td>
                          <td className="py-3 sm:py-4 text-right">
                            <span className="text-xl sm:text-2xl font-bold text-red-600">-1</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 sm:py-4">
                            <div className="flex items-center space-x-3">
                              <span className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </span>
                              <span className="text-sm sm:text-base text-gray-700">Sans réponse</span>
                            </div>
                          </td>
                          <td className="py-3 sm:py-4 text-right">
                            <span className="text-xl sm:text-2xl font-bold text-gray-500">0</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-sm text-blue-800 text-center">
                      <strong>Score final</strong> = Nombre de bonnes réponses - Nombre de mauvaises réponses
                    </p>
                  </div>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    Pour les questions à choix multiples, toutes les bonnes réponses doivent être cochées.
                  </p>
                </div>
              </div>
            </div>

            {/* Bandeau de confiance */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-md max-w-4xl mx-auto">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <p className="font-bold text-gray-800 text-sm sm:text-base">Sécurisé</p>
                  <p className="text-xs text-gray-500 hidden sm:block">Données protégées</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="font-bold text-gray-800 text-sm sm:text-base">+1000</p>
                  <p className="text-xs text-gray-500 hidden sm:block">Candidats formés</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <p className="font-bold text-gray-800 text-sm sm:text-base">Certifié</p>
                  <p className="text-xs text-gray-500 hidden sm:block">Contenu officiel</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer theme={theme} />
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // AUTRES PAGES
  // ═════════════════════════════════════════════════════════════════

  if (step === 'userForm') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header theme={theme} showThemeSelector={false} isAuthenticated={!!user} userName={userProfile?.full_name} onLoginClick={handleLoginClick} onLogoutClick={handleLogoutClick} onProfileClick={() => setShowProfile(true)} />
        {ProfileModal}
        <UserForm onSubmit={handleUserSubmit} onBack={() => setStep('home')} theme={theme} />
      </div>
    );
  }

  if (step === 'concoursSelection') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header theme={theme} showThemeSelector={false} isAuthenticated={!!user} userName={userProfile?.full_name} onLoginClick={handleLoginClick} onLogoutClick={handleLogoutClick} onProfileClick={() => setShowProfile(true)} />
        {ProfileModal}
        <ConcoursSelection concoursData={concoursData} onSelect={handleConcoursSelect} onBack={() => setStep(user ? 'home' : 'userForm')} onGenerateCustom={handleGenerateCustom} theme={theme} />
      </div>
    );
  }

  if (step === 'customExam') {
    // Pour les examens personnalisés, on utilise les données LOCALES
    // car elles contiennent les correctAnswers nécessaires au calcul du score
    return (
      <div className="flex flex-col min-h-screen">
        <Header theme={theme} showThemeSelector={false} isAuthenticated={!!user} userName={userProfile?.full_name} onLoginClick={handleLoginClick} onLogoutClick={handleLogoutClick} onProfileClick={() => setShowProfile(true)} />
        {ProfileModal}
        <CustomExamGenerator concoursData={localConcoursData} onGenerate={handleCustomExamGenerate} onBack={() => setStep('concoursSelection')} theme={theme} />
      </div>
    );
  }

  if (step === 'quiz' && selectedConcours) {
    // Activer le proctoring uniquement pour les examens officiels (pas les examens personnalisés)
    const enableProctoring = selectedConcours.id !== 'custom-exam';
    return (
      <QuizPage 
        concours={selectedConcours} 
        onSubmit={handleQuizSubmit} 
        onGoHome={handleRestart} 
        theme={theme}
        enableProctoring={enableProctoring}
      />
    );
  }

  if (step === 'result' && quizResult && selectedConcours) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header theme={theme} showThemeSelector={false} isAuthenticated={!!user} userName={userProfile?.full_name} onLoginClick={handleLoginClick} onLogoutClick={handleLogoutClick} onProfileClick={() => setShowProfile(true)} />
        {ProfileModal}
        <ResultPage result={quizResult} questions={selectedConcours.questions} onGoHome={handleRestart} />
        <Footer theme={theme} />
      </div>
    );
  }

  return null;
}
