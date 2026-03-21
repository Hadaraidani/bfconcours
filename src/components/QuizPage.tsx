import { useState, useEffect, useCallback } from 'react';
import { Concours, UserAnswer, Question, Theme } from '../types';
import { categoryLabels, categoryLabelsShort } from '../data/questions';
import { MathRenderer, QuestionImage } from './MathRenderer';
import ProctoringConsent from './roctoringConsent';
import {
  startProctoringSession,
  endProctoringSession,
  ProctoringAlert,
  getSessionSummary,
} from '../services/roctoringService';

interface QuizPageProps {
  concours: Concours;
  onSubmit: (answers: UserAnswer[], duration: number, proctoringData?: any) => void;
  onGoHome: () => void;
  theme: Theme;
  enableProctoring?: boolean; // Activer/désactiver le proctoring
}

export function QuizPage({ concours, onSubmit, onGoHome, theme, enableProctoring = true }: QuizPageProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(concours.duration * 60);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [mobileView, setMobileView] = useState<'question' | 'answers'>('question');
  
  // États pour le proctoring
  const [showProctoringConsent, setShowProctoringConsent] = useState(enableProctoring);
  const [proctoringStarted, setProctoringStarted] = useState(false);
  const [proctoringAlerts, setProctoringAlerts] = useState<ProctoringAlert[]>([]);
  const [proctoringPenalty, setProctoringPenalty] = useState(0);
  const [showProctoringDetails, setShowProctoringDetails] = useState(false);

  const questions = concours.questions;
  const currentQuestion = questions[currentQuestionIndex];

  // Démarrer le proctoring après consentement
  const handleProctoringAccept = () => {
    startProctoringSession({
      enableTabDetection: true,
      enableCopyPasteBlock: true,
      enableFullscreenMode: true,
      enableKeyboardDetection: true,
      maxTabSwitches: 5,
      onAlert: (alert) => {
        setProctoringAlerts(prev => [...prev, alert]);
        setProctoringPenalty(prev => prev + alert.pointsPenalty);
      },
    });
    setProctoringStarted(true);
    setShowProctoringConsent(false);
  };

  // Refuser le proctoring = retour à l'accueil
  const handleProctoringDecline = () => {
    onGoHome();
  };

  // Arrêter le proctoring à la fin
  useEffect(() => {
    return () => {
      if (proctoringStarted) {
        endProctoringSession();
      }
    };
  }, [proctoringStarted]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = useCallback(() => {
    const duration = concours.duration * 60 - timeLeft;
    
    // Récupérer les données de proctoring si activé
    let proctoringData = null;
    if (proctoringStarted) {
      proctoringData = getSessionSummary();
      endProctoringSession();
    }
    
    onSubmit(answers, duration, proctoringData);
  }, [answers, timeLeft, concours.duration, onSubmit, proctoringStarted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft < 300) return 'text-red-600 bg-red-50';
    if (timeLeft < 600) return 'text-orange-600 bg-orange-50';
    return 'text-emerald-600 bg-emerald-50';
  };

  const toggleAnswer = (questionId: number, optionIndex: number) => {
    setAnswers((prev) => {
      const existingAnswer = prev.find((a) => a.questionId === questionId);
      if (existingAnswer) {
        const newSelected = existingAnswer.selectedOptions.includes(optionIndex)
          ? existingAnswer.selectedOptions.filter((i) => i !== optionIndex)
          : [...existingAnswer.selectedOptions, optionIndex];
        
        if (newSelected.length === 0) {
          return prev.filter((a) => a.questionId !== questionId);
        }
        
        return prev.map((a) =>
          a.questionId === questionId ? { ...a, selectedOptions: newSelected } : a
        );
      }
      return [...prev, { questionId, selectedOptions: [optionIndex] }];
    });
  };

  const isOptionSelected = (questionId: number, optionIndex: number) => {
    const answer = answers.find((a) => a.questionId === questionId);
    return answer?.selectedOptions.includes(optionIndex) || false;
  };

  const isQuestionAnswered = (questionId: number) => {
    return answers.some((a) => a.questionId === questionId && a.selectedOptions.length > 0);
  };

  const getAnsweredCount = () => {
    return answers.filter((a) => a.selectedOptions.length > 0).length;
  };

  // Grouper les questions par catégorie
  const questionsByCategory = questions.reduce((acc, q, index) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push({ ...q, originalIndex: index });
    return acc;
  }, {} as Record<string, (Question & { originalIndex: number })[]>);

  const getThemeColors = () => {
    switch (theme) {
      case 'blue':
        return { primary: 'bg-blue-600', light: 'bg-blue-100 text-blue-700', border: 'border-blue-500' };
      case 'purple':
        return { primary: 'bg-purple-600', light: 'bg-purple-100 text-purple-700', border: 'border-purple-500' };
      case 'orange':
        return { primary: 'bg-orange-600', light: 'bg-orange-100 text-orange-700', border: 'border-orange-500' };
      case 'red':
        return { primary: 'bg-red-600', light: 'bg-red-100 text-red-700', border: 'border-red-500' };
      default:
        return { primary: 'bg-emerald-600', light: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-500' };
    }
  };

  const colors = getThemeColors();

  // Si le proctoring est activé, afficher le consentement d'abord
  if (showProctoringConsent) {
    return (
      <ProctoringConsent
        concoursName={concours.name}
        onAccept={handleProctoringAccept}
        onDecline={handleProctoringDecline}
      />
    );
  }

  // Calculer le score de confiance
  const trustScore = Math.max(0, 100 + proctoringPenalty);
  const getTrustColor = () => {
    if (trustScore >= 90) return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' };
    if (trustScore >= 70) return { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-50' };
    if (trustScore >= 50) return { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' };
    return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
  };
  const trustColors = getTrustColor();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header fixe avec timer */}
      <div className="sticky top-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            {/* Bouton retour + Info concours */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Bouton retour accueil */}
              <button
                onClick={() => setShowExitModal(true)}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                title="Retour a l'accueil"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
              
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm sm:text-lg font-bold text-gray-800 truncate max-w-[100px] sm:max-w-none">
                  {concours.name.split(' - ')[0]}
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Question {currentQuestionIndex + 1} / {questions.length}
                </p>
              </div>
            </div>

            {/* Timer + Proctoring */}
            <div className="flex items-center space-x-2">
              {/* Timer */}
              <div className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl ${getTimeColor()}`}>
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-mono font-bold text-sm sm:text-lg">{formatTime(timeLeft)}</span>
              </div>

              {/* Indicateur de surveillance (intégré au header) */}
              {proctoringStarted && (
                <button
                  onClick={() => setShowProctoringDetails(true)}
                  className={`flex items-center space-x-2 px-3 py-1.5 sm:py-2 rounded-xl ${trustColors.light} border transition-all hover:shadow-md`}
                  title="Cliquez pour voir les détails de surveillance"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className={`font-bold text-sm sm:text-base ${trustColors.text}`}>{trustScore}%</span>
                  {proctoringPenalty < 0 && (
                    <span className="text-red-600 font-bold text-sm">{proctoringPenalty}</span>
                  )}
                </button>
              )}
            </div>

            {/* Progression */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-sm text-gray-600">
                <span className="font-bold">{getAnsweredCount()}</span> / {questions.length} repondu(es)
              </div>
              <button
                onClick={() => setShowConfirmModal(true)}
                className={`${colors.primary} text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity`}
              >
                Soumettre
              </button>
            </div>
          </div>

          {/* Barre de progression mobile */}
          <div className="sm:hidden mt-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Q{currentQuestionIndex + 1}/{questions.length}</span>
              <span>{getAnsweredCount()} repondu(es)</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${colors.primary} transition-all duration-300`}
                style={{ width: `${(getAnsweredCount() / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Navigation par matière */}
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="max-w-7xl mx-auto px-2 sm:px-6">
            <div className="flex overflow-x-auto py-2 space-x-1 sm:space-x-2 scrollbar-hide">
              {concours.categories.map((catConfig) => {
                const categoryQuestions = questionsByCategory[catConfig.id] || [];
                if (categoryQuestions.length === 0) return null;
                
                const answeredInCategory = categoryQuestions.filter(q => isQuestionAnswered(q.id)).length;
                const isCurrentCategory = currentQuestion.category === catConfig.id;
                const firstQuestionIndex = categoryQuestions[0]?.originalIndex || 0;
                
                return (
                  <button
                    key={catConfig.id}
                    onClick={() => setCurrentQuestionIndex(firstQuestionIndex)}
                    className={`flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      isCurrentCategory
                        ? `${colors.primary} text-white`
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span className="hidden sm:inline">{catConfig.name}</span>
                    <span className="sm:hidden">{categoryLabelsShort[catConfig.id] || catConfig.name.substring(0, 3)}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isCurrentCategory 
                        ? 'bg-white/20 text-white' 
                        : answeredInCategory === categoryQuestions.length 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      {answeredInCategory}/{categoryQuestions.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Navigation mobile (onglets) */}
        <div className="sm:hidden border-t border-gray-200">
          <div className="flex">
            <button
              onClick={() => setMobileView('question')}
              className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center space-x-1 ${
                mobileView === 'question'
                  ? `${colors.light} border-b-2 ${colors.border}`
                  : 'text-gray-500'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Question</span>
            </button>
            <button
              onClick={() => setMobileView('answers')}
              className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center space-x-1 ${
                mobileView === 'answers'
                  ? `${colors.light} border-b-2 ${colors.border}`
                  : 'text-gray-500'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Feuille ({getAnsweredCount()})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-6 py-3 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-full">
          
          {/* Panneau de gauche - Question (desktop ou mobile si sélectionné) */}
          <div className={`lg:flex-1 ${mobileView === 'question' ? 'block' : 'hidden'} sm:block`}>
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
              {/* Catégorie */}
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${colors.light}`}>
                  {categoryLabels[currentQuestion.category]}
                </span>
                {currentQuestion.correctAnswers.length > 1 && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    Plusieurs réponses
                  </span>
                )}
              </div>

              {/* Question */}
              <div className="mb-6">
                <h2 className="text-base sm:text-xl font-semibold text-gray-800 mb-4">
                  <span className="text-gray-400 mr-2">Q{currentQuestionIndex + 1}.</span>
                  <MathRenderer text={currentQuestion.question} />
                </h2>

                {/* Image de la question */}
                {currentQuestion.image && (
                  <QuestionImage 
                    src={currentQuestion.image} 
                    alt={currentQuestion.imageAlt}
                    position={currentQuestion.imagePosition}
                  />
                )}
              </div>

              {/* Options */}
              <div className="space-y-2 sm:space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = isOptionSelected(currentQuestion.id, index);
                  const letter = String.fromCharCode(65 + index);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => toggleAnswer(currentQuestion.id, index)}
                      className={`w-full p-3 sm:p-4 rounded-xl border-2 text-left transition-all flex items-center space-x-3 ${
                        isSelected
                          ? `${colors.border} bg-emerald-50`
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        isSelected ? `${colors.primary} text-white` : 'bg-gray-100 text-gray-600'
                      }`}>
                        {letter}
                      </div>
                      <span className="flex-1 text-sm sm:text-base text-gray-700">
                        <MathRenderer text={option} />
                      </span>
                      {isSelected && (
                        <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm sm:text-base">Préc.</span>
                </button>

                <span className="text-sm text-gray-500">
                  {currentQuestionIndex + 1} / {questions.length}
                </span>

                <button
                  onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="text-sm sm:text-base">Suiv.</span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Panneau de droite - Feuille de réponses */}
          <div className={`lg:w-80 xl:w-96 ${mobileView === 'answers' ? 'block' : 'hidden'} sm:block`}>
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:sticky lg:top-32">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Feuille de reponses</span>
              </h3>

              {/* Grille par catégorie */}
              <div className="space-y-4 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto pr-2">
                {concours.categories.map((catConfig) => {
                  const categoryQuestions = questionsByCategory[catConfig.id] || [];
                  if (categoryQuestions.length === 0) return null;
                  
                  return (
                    <div key={catConfig.id}>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          <span className="sm:hidden">{categoryLabelsShort[catConfig.id] || catConfig.name.substring(0, 3)}</span>
                          <span className="hidden sm:inline">{catConfig.name}</span>
                        </span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                      </div>
                      
                      <div className="space-y-1">
                        {categoryQuestions.map((q) => {
                          const answered = isQuestionAnswered(q.id);
                          const isCurrent = q.originalIndex === currentQuestionIndex;
                          const selectedOptions = answers.find(a => a.questionId === q.id)?.selectedOptions || [];
                          
                          return (
                            <div 
                              key={q.id}
                              className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-all ${
                                isCurrent ? 'bg-blue-50 ring-2 ring-blue-400' : answered ? 'bg-green-50' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => {
                                setCurrentQuestionIndex(q.originalIndex);
                                setMobileView('question');
                              }}
                            >
                              {/* Numéro de question */}
                              <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${
                                answered ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                              }`}>
                                {q.originalIndex + 1}
                              </span>
                              
                              {/* Cases de réponses */}
                              <div className="flex space-x-1 flex-1">
                                {q.options.map((_, optIndex) => {
                                  const letter = String.fromCharCode(65 + optIndex);
                                  const isChecked = selectedOptions.includes(optIndex);
                                  
                                  return (
                                    <button
                                      key={optIndex}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleAnswer(q.id, optIndex);
                                      }}
                                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded text-xs font-medium transition-all ${
                                        isChecked
                                          ? `${colors.primary} text-white`
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      {letter}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Légende */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-green-500 rounded"></span>
                    <span>Répondu</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-gray-200 rounded"></span>
                    <span>Non répondu</span>
                  </div>
                </div>

                {/* Bouton soumettre mobile */}
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className={`w-full ${colors.primary} text-white py-3 rounded-xl font-medium hover:opacity-90 transition-opacity sm:hidden`}
                >
                  Soumettre ({getAnsweredCount()}/{questions.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmation */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Confirmer la soumission</h3>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{getAnsweredCount()}</p>
                  <p className="text-xs text-gray-500">Répondu(es)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-400">{questions.length - getAnsweredCount()}</p>
                  <p className="text-xs text-gray-500">Non répondu(es)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{questions.length}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </div>

            {questions.length - getAnsweredCount() > 0 && (
              <p className="text-sm text-amber-600 text-center mb-4">
                Vous avez {questions.length - getAnsweredCount()} question(s) sans reponse
              </p>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                className={`flex-1 ${colors.primary} text-white px-4 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity`}
              >
                Soumettre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de sortie */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Quitter le QCM ?</h3>
              <p className="text-gray-600 mt-2">
                Attention ! Si vous quittez maintenant, toutes vos reponses seront perdues.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Progression actuelle :</p>
                  <p>{getAnsweredCount()} question(s) sur {questions.length} repondue(s)</p>
                  <p>Temps restant : {formatTime(timeLeft)}</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-medium transition-colors"
              >
                Continuer le QCM
              </button>
              <button
                onClick={onGoHome}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal des détails de proctoring */}
      {showProctoringDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 ${trustColors.bg} rounded-full flex items-center justify-center`}>
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Surveillance</h3>
                  <p className="text-sm text-gray-500">Score de confiance: {trustScore}%</p>
                </div>
              </div>
              <button
                onClick={() => setShowProctoringDetails(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Score et pénalité */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`${trustColors.light} rounded-xl p-4 text-center`}>
                <p className={`text-3xl font-bold ${trustColors.text}`}>{trustScore}%</p>
                <p className="text-sm text-gray-600">Confiance</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{proctoringPenalty}</p>
                <p className="text-sm text-gray-600">Points de pénalité</p>
              </div>
            </div>

            {/* Historique des alertes */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-3">Historique des alertes</h4>
              {proctoringAlerts.length === 0 ? (
                <div className="text-center py-6 bg-green-50 rounded-xl">
                  <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-green-700 font-medium">Aucune infraction détectée</p>
                  <p className="text-green-600 text-sm">Continuez ainsi !</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {proctoringAlerts.map((alert, index) => (
                    <div key={index} className={`p-3 rounded-lg border-l-4 ${
                      alert.type === 'grave' ? 'bg-red-50 border-red-500' :
                      alert.type === 'critical' ? 'bg-orange-50 border-orange-500' :
                      alert.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800 text-sm">{alert.message}</span>
                        <span className="text-red-600 font-bold text-sm">{alert.pointsPenalty} pts</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString('fr-FR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Règles */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-800 mb-3">Règles de surveillance</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Changement d'onglet</span>
                  <span className="text-red-600 font-bold">-3 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tentative d'inspection (F12)</span>
                  <span className="text-red-600 font-bold">-5 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Copier/Coller</span>
                  <span className="text-red-600 font-bold">-1 pt</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Clic droit</span>
                  <span className="text-red-600 font-bold">-1 pt</span>
                </div>
              </div>
            </div>

            {/* Bouton fermer */}
            <button
              onClick={() => setShowProctoringDetails(false)}
              className="w-full mt-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-medium transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
