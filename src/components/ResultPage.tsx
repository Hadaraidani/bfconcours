/**
 * Page de résultats après soumission du QCM
 * 
 * DESIGN PROFESSIONNEL avec animations et effets visuels
 * 
 * Pour les examens officiels :
 * - Animation d'envoi élégante
 * - Confirmation visuelle de succès
 * - Récapitulatif stylisé
 * 
 * Pour les examens personnalisés :
 * - Score affiché immédiatement
 * - Performance par matière
 * - Correction détaillée
 */

import { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { QuizResult, Question, Category } from '../types';
import { generateCorrectionUrl } from '../services/quizService';
import { EMAILJS_CONFIG } from '../config/emailjs';
import { MathRenderer } from './MathRenderer';

// Labels des catégories
const categoryLabels: Record<Category, string> = {
  francais: 'Français',
  maths: 'Mathématiques',
  physique: 'Physique',
  svt: 'SVT',
  chimie: 'Chimie',
  psychotechnique: 'Psychotechnique',
  culture: 'Culture Générale',
  histoire: 'Histoire',
  geographie: 'Géographie',
  droit_constitutionnel: 'Droit Constitutionnel',
  droit_administratif: 'Droit Administratif',
  droit_penal: 'Droit Pénal',
  droit_civil: 'Droit Civil',
  economie: 'Économie',
  comptabilite: 'Comptabilité',
  fiscalite: 'Fiscalité',
  informatique: 'Informatique',
  anglais: 'Anglais',
  philosophie: 'Philosophie',
  sport: 'Sport',
  pedagogie: 'Pédagogie',
  didactique: 'Didactique',
  psychologie: 'Psychologie',
  biologie: 'Biologie',
  anatomie: 'Anatomie',
  pharmacologie: 'Pharmacologie',
  soins_infirmiers: 'Soins Infirmiers',
  sante_publique: 'Santé Publique',
  secourisme: 'Secourisme',
  education_civique: 'Éducation Civique',
  logique: 'Logique',
  raisonnement: 'Raisonnement',
};

interface ResultPageProps {
  result: QuizResult;
  questions: Question[];
  onGoHome: () => void;
}

interface CategoryPerformance {
  category: string;
  categoryName: string;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
  percentage: number;
}

export function ResultPage({ result, questions, onGoHome }: ResultPageProps) {
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showCorrection, setShowCorrection] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  
  const isCustomExam = result.isCustomExam === true;

  const steps = [
    { label: 'Préparation de votre copie', icon: '📋' },
    { label: 'Sauvegarde des réponses', icon: '💾' },
    { label: 'Génération du rapport', icon: '📊' },
    { label: 'Envoi à l\'administration', icon: '📧' },
    { label: 'Confirmation', icon: '✅' },
  ];

  // Animation de progression
  useEffect(() => {
    if (sendStatus === 'sending') {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const stepInterval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= 3) {
            clearInterval(stepInterval);
            return 3;
          }
          return prev + 1;
        });
      }, 1500);

      return () => {
        clearInterval(progressInterval);
        clearInterval(stepInterval);
      };
    }
    
    if (sendStatus === 'success') {
      setProgress(100);
      setCurrentStep(4);
    }
  }, [sendStatus]);

  // Envoyer les résultats à l'administrateur
  useEffect(() => {
    if (isCustomExam) {
      console.log('Examen personnalisé - pas d\'envoi à l\'administrateur');
      return;
    }

    async function sendResults() {
      setSendStatus('sending');

      try {
        let correctionUrl: string;

        // Utiliser le submissionId généré par Supabase
        if (result.submissionId) {
          correctionUrl = generateCorrectionUrl(result.submissionId);
          console.log('✅ Utilisation du submissionId Supabase:', result.submissionId);
        } else {
          // Si pas de submissionId (mode local), générer un ID temporaire
          const tempId = `local-${Date.now()}`;
          correctionUrl = generateCorrectionUrl(tempId);
          console.warn('⚠️ Pas de submissionId - mode local');
        }
        
        console.log('🔗 URL de correction:', correctionUrl);

        // 2. Envoyer l'email via EmailJS
        const templateParams = {
          to_email: EMAILJS_CONFIG.adminEmail,
          candidate_name: `${result.user.prenom} ${result.user.nom}`,
          candidate_phone: result.user.telephone,
          concours_name: result.concours,
          score: result.score,
          total_questions: result.totalQuestions,
          correct_count: result.bonnesReponses,
          wrong_count: result.mauvaisesReponses,
          unanswered_count: result.sansReponse,
          submission_date: new Date().toLocaleString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          correction_url: correctionUrl,
        };

        await emailjs.send(
          EMAILJS_CONFIG.serviceId,
          EMAILJS_CONFIG.templateId,
          templateParams,
          EMAILJS_CONFIG.publicKey
        );

        console.log('✅ Email envoyé avec succès');
        
        // Petite pause pour l'animation
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSendStatus('success');

      } catch (err) {
        console.error('Erreur:', err);
        setErrorMessage(err instanceof Error ? err.message : 'Erreur inconnue');
        setSendStatus('error');
      }
    }

    sendResults();
  }, [result, questions, isCustomExam]);

  // Calculer les performances par catégorie
  const calculateCategoryPerformance = (): CategoryPerformance[] => {
    const categoryStats: Record<string, CategoryPerformance> = {};

    result.answers.forEach((answer) => {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) return;

      const cat = question.category;
      
      if (!categoryStats[cat]) {
        categoryStats[cat] = {
          category: cat,
          categoryName: categoryLabels[cat] || cat,
          total: 0,
          correct: 0,
          wrong: 0,
          unanswered: 0,
          score: 0,
          percentage: 0,
        };
      }

      categoryStats[cat].total++;

      if (answer.selectedOptions.length === 0) {
        categoryStats[cat].unanswered++;
      } else if (answer.isCorrect) {
        categoryStats[cat].correct++;
        categoryStats[cat].score++;
      } else {
        categoryStats[cat].wrong++;
        categoryStats[cat].score--;
      }
    });

    // Calculer les pourcentages
    Object.values(categoryStats).forEach((stat) => {
      const maxScore = stat.total;
      stat.percentage = maxScore > 0 ? Math.max(0, (stat.score / maxScore) * 100) : 0;
    });

    return Object.values(categoryStats);
  };

  // ==========================================
  // AFFICHAGE POUR EXAMEN PERSONNALISÉ
  // ==========================================
  
  if (isCustomExam) {
    const categoryPerformance = calculateCategoryPerformance();
    const percentage = Math.round((result.score / result.totalQuestions) * 100);

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* En-tête avec animation */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
            {/* Bannière de succès */}
            <div className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 p-6 sm:p-8 text-white relative overflow-hidden">
              {/* Motifs décoratifs */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="relative text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4 animate-bounce">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  Examen terminé !
                </h1>
                <p className="text-green-100">
                  Voici vos résultats détaillés
                </p>
              </div>
            </div>

            {/* Score principal */}
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Cercle de score */}
                <div className="relative">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      fill="none"
                      stroke={percentage >= 50 ? '#22c55e' : '#ef4444'}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${(percentage / 100) * 377} 377`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">{result.score}</span>
                    <span className="text-sm text-gray-500">sur {result.totalQuestions}</span>
                  </div>
                </div>

                {/* Statistiques */}
                <div className="flex-1 grid grid-cols-3 gap-4 w-full">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border border-green-200">
                    <div className="inline-flex items-center justify-center w-10 h-10 bg-green-500 rounded-lg mb-2">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{result.bonnesReponses}</p>
                    <p className="text-xs text-green-700">Correctes</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 text-center border border-red-200">
                    <div className="inline-flex items-center justify-center w-10 h-10 bg-red-500 rounded-lg mb-2">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{result.mauvaisesReponses}</p>
                    <p className="text-xs text-red-700">Incorrectes</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200">
                    <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-500 rounded-lg mb-2">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-2xl font-bold text-gray-600">{result.sansReponse}</p>
                    <p className="text-xs text-gray-700">Sans réponse</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance par matière */}
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Performance par matière</h2>
            </div>
            
            <div className="space-y-4">
              {categoryPerformance.map((cat, index) => (
                <div 
                  key={cat.category} 
                  className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        cat.percentage >= 70 ? 'bg-green-500' :
                        cat.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="font-semibold text-gray-800">{cat.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${
                        cat.score >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {cat.score >= 0 ? '+' : ''}{cat.score}
                      </span>
                      <span className="text-sm text-gray-500">/ {cat.total}</span>
                    </div>
                  </div>
                  
                  <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${
                        cat.percentage >= 70 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                        cat.percentage >= 50 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 
                        'bg-gradient-to-r from-red-400 to-red-500'
                      }`}
                      style={{ width: `${Math.max(5, cat.percentage)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="flex items-center gap-1 text-green-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {cat.correct} correcte(s)
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      {cat.wrong} incorrecte(s)
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      {cat.unanswered} sans réponse
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bouton correction détaillée */}
          <div className="text-center mb-6">
            <button
              onClick={() => setShowCorrection(!showCorrection)}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:from-gray-900 hover:to-black transition-all shadow-lg hover:shadow-xl"
            >
              <svg className={`w-5 h-5 transition-transform ${showCorrection ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="font-semibold">
                {showCorrection ? 'Masquer la correction' : 'Voir la correction détaillée'}
              </span>
            </button>
          </div>

          {/* Correction détaillée */}
          {showCorrection && (
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Correction détaillée</h2>
              </div>
              
              <div className="space-y-6">
                {result.answers.map((answer, index) => {
                  const question = questions.find(q => q.id === answer.questionId);
                  if (!question) return null;

                  const isCorrect = answer.isCorrect;
                  const isUnanswered = answer.selectedOptions.length === 0;

                  return (
                    <div
                      key={index}
                      className={`rounded-xl border-2 overflow-hidden transition-all ${
                        isUnanswered
                          ? 'border-gray-200 bg-gray-50'
                          : isCorrect
                          ? 'border-green-300 bg-green-50'
                          : 'border-red-300 bg-red-50'
                      }`}
                    >
                      {/* En-tête de la question */}
                      <div className={`px-4 py-3 flex items-center justify-between ${
                        isUnanswered
                          ? 'bg-gray-100'
                          : isCorrect
                          ? 'bg-green-100'
                          : 'bg-red-100'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${
                            isUnanswered
                              ? 'bg-gray-500 text-white'
                              : isCorrect
                              ? 'bg-green-500 text-white'
                              : 'bg-red-500 text-white'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="text-sm text-gray-600 bg-white/50 px-2 py-1 rounded">
                            {categoryLabels[question.category] || question.category}
                          </span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          isUnanswered
                            ? 'bg-gray-200 text-gray-600'
                            : isCorrect
                            ? 'bg-green-200 text-green-700'
                            : 'bg-red-200 text-red-700'
                        }`}>
                          {isUnanswered ? '0 pt' : isCorrect ? '+1 pt' : '-1 pt'}
                        </span>
                      </div>

                      {/* Corps de la question */}
                      <div className="p-4">
                        <div className="mb-4 text-gray-800 font-medium">
                          <MathRenderer text={question.question} />
                        </div>

                        <div className="grid gap-2">
                          {question.options.map((option, optIndex) => {
                            const isSelected = answer.selectedOptions.includes(optIndex);
                            const isCorrectOption = question.correctAnswers.includes(optIndex);

                            let styles = 'bg-white border-gray-200 text-gray-700';
                            
                            if (isCorrectOption && isSelected) {
                              styles = 'bg-green-100 border-green-400 text-green-800';
                            } else if (isCorrectOption && !isSelected) {
                              styles = 'bg-green-50 border-green-300 border-dashed text-green-700';
                            } else if (!isCorrectOption && isSelected) {
                              styles = 'bg-red-100 border-red-400 text-red-800';
                            }

                            return (
                              <div
                                key={optIndex}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 ${styles}`}
                              >
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg font-bold text-sm">
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <div className="flex-1">
                                  <MathRenderer text={option} />
                                </div>
                                <div className="flex items-center gap-2">
                                  {isSelected && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                      Votre choix
                                    </span>
                                  )}
                                  {isCorrectOption && (
                                    <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bouton retour */}
          <div className="text-center">
            <button
              onClick={onGoHome}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // AFFICHAGE POUR EXAMEN OFFICIEL (CONCOURS)
  // ==========================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-4 sm:py-8">
      <div className="max-w-2xl mx-auto px-4">
        
        {/* Statut: Envoi en cours */}
        {sendStatus === 'sending' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header animé */}
            <div className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 p-8 text-white relative overflow-hidden">
              {/* Particules animées */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${2 + Math.random() * 2}s`,
                    }}
                  ></div>
                ))}
              </div>
              
              <div className="relative text-center">
                {/* Animation de chargement */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <svg className="w-24 h-24 animate-spin" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="white"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="200"
                      strokeDashoffset={200 - (progress / 100) * 200}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{Math.round(progress)}%</span>
                  </div>
                </div>
                
                <h1 className="text-2xl font-bold mb-2">Envoi en cours</h1>
                <p className="text-green-100">Veuillez patienter...</p>
              </div>
            </div>

            {/* Étapes de progression */}
            <div className="p-6">
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                      index < currentStep
                        ? 'bg-green-50 border border-green-200'
                        : index === currentStep
                        ? 'bg-blue-50 border border-blue-200 animate-pulse'
                        : 'bg-gray-50 border border-gray-200 opacity-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      index < currentStep
                        ? 'bg-green-500 text-white'
                        : index === currentStep
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-500'
                    }`}>
                      {index < currentStep ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span>{step.icon}</span>
                      )}
                    </div>
                    <span className={`font-medium ${
                      index <= currentStep ? 'text-gray-800' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Statut: Succès */}
        {sendStatus === 'success' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header de succès */}
            <div className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 p-8 text-white relative overflow-hidden">
              {/* Confettis animés */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 rounded-full animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      backgroundColor: ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa'][i % 5],
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1 + Math.random() * 2}s`,
                    }}
                  ></div>
                ))}
              </div>
              
              <div className="relative text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-6">
                  <svg className="w-12 h-12 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  Copie envoyée avec succès !
                </h1>
                <p className="text-green-100">
                  Votre copie a été transmise à l'administration
                </p>
              </div>
            </div>

            {/* Contenu */}
            <div className="p-6 sm:p-8">
              {/* Récapitulatif stylisé */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6">
                <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-4">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Récapitulatif de votre soumission
                </h3>
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="text-gray-600">Candidat</span>
                    </div>
                    <span className="font-semibold text-gray-800">{result.user.prenom} {result.user.nom}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <span className="text-gray-600">Téléphone</span>
                    </div>
                    <span className="font-semibold text-gray-800">{result.user.telephone}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <span className="text-gray-600">Concours</span>
                    </div>
                    <span className="font-semibold text-gray-800">{result.concours}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <span className="text-gray-600">Questions</span>
                    </div>
                    <span className="font-semibold text-gray-800">{result.totalQuestions} questions</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-gray-600">Date</span>
                    </div>
                    <span className="font-semibold text-gray-800">
                      {new Date().toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Note importante */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-800 mb-1">Information importante</h4>
                    <p className="text-sm text-amber-700">
                      Pour préserver l'intégrité de l'examen, votre score n'est pas affiché. 
                      Seule l'administration a accès à votre correction détaillée et vous contactera pour les résultats.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bouton retour */}
              <div className="text-center">
                <button
                  onClick={onGoHome}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Retour à l'accueil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statut: Erreur */}
        {sendStatus === 'error' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header erreur */}
            <div className="bg-gradient-to-r from-red-500 via-red-600 to-rose-600 p-8 text-white relative overflow-hidden">
              <div className="relative text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-6">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                
                <h1 className="text-2xl font-bold mb-2">
                  Erreur d'envoi
                </h1>
                <p className="text-red-100">
                  Un problème est survenu lors de l'envoi
                </p>
              </div>
            </div>

            {/* Contenu erreur */}
            <div className="p-6 sm:p-8">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 mb-6">
                <p className="text-red-700 text-sm">{errorMessage}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Réessayer
                </button>
                <button
                  onClick={onGoHome}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Retour à l'accueil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statut: Idle (chargement initial) */}
        {sendStatus === 'idle' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="animate-pulse space-y-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto"></div>
                <div className="h-6 bg-gray-200 rounded w-48 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
