import { useState, useEffect, useMemo } from 'react';
import { getCorrection, CorrectionQuestion, CorrectionResult } from '../services/quizService';
import { MathRenderer } from './MathRenderer';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface CorrectionPageProps {
  submissionId: string;
  onGoHome: () => void;
}

interface CategoryPerformance {
  id: string;
  name: string;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
  percentage: number;
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════

const categoryNames: Record<string, string> = {
  francais: 'Français',
  maths: 'Mathématiques',
  physique: 'Physique',
  chimie: 'Chimie',
  svt: 'SVT',
  histoire: 'Histoire',
  geographie: 'Géographie',
  culture: 'Culture Générale',
  psychotechnique: 'Psychotechnique',
  droit_constitutionnel: 'Droit Constitutionnel',
  droit_administratif: 'Droit Administratif',
  droit_penal: 'Droit Pénal',
  droit_civil: 'Droit Civil',
  economie: 'Économie',
  comptabilite: 'Comptabilité',
  fiscalite: 'Fiscalité',
  informatique: 'Informatique',
  anglais: 'Anglais',
  sport: 'Sport',
  pedagogie: 'Pédagogie',
  biologie: 'Biologie',
  anatomie: 'Anatomie',
  pharmacologie: 'Pharmacologie',
  soins_infirmiers: 'Soins Infirmiers',
  psychologie: 'Psychologie',
};

// ═══════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export function CorrectionPage({ submissionId, onGoHome }: CorrectionPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [correction, setCorrection] = useState<CorrectionResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Charger la correction
  useEffect(() => {
    async function loadCorrection() {
      setLoading(true);
      setError(null);

      console.log('🔄 Chargement de la correction pour:', submissionId);

      const result = await getCorrection(submissionId);

      if (!result.success) {
        setError(result.error || 'Erreur lors du chargement de la correction');
        setLoading(false);
        return;
      }

      console.log('✅ Correction chargée:', result);
      setCorrection(result);
      setLoading(false);
    }

    loadCorrection();
  }, [submissionId]);

  // Calculer les performances par catégorie
  const categoryPerformances = useMemo<CategoryPerformance[]>(() => {
    if (!correction?.questions || correction.questions.length === 0) {
      return [];
    }

    const perfMap: Record<string, CategoryPerformance> = {};

    correction.questions.forEach((q: CorrectionQuestion) => {
      const catId = q.category_id || 'other';
      
      if (!perfMap[catId]) {
        perfMap[catId] = {
          id: catId,
          name: categoryNames[catId] || catId,
          total: 0,
          correct: 0,
          wrong: 0,
          unanswered: 0,
          score: 0,
          percentage: 0
        };
      }

      perfMap[catId].total++;

      const userAnswers = q.user_answers || [];

      if (userAnswers.length === 0) {
        perfMap[catId].unanswered++;
      } else if (q.is_correct) {
        perfMap[catId].correct++;
        perfMap[catId].score++;
      } else {
        perfMap[catId].wrong++;
        perfMap[catId].score--;
      }
    });

    // Calculer les pourcentages
    return Object.values(perfMap).map(p => ({
      ...p,
      percentage: p.total > 0 ? Math.round((p.correct / p.total) * 100) : 0
    }));
  }, [correction]);

  // ═════════════════════════════════════════════════════════════════
  // ÉTATS DE CHARGEMENT ET ERREUR
  // ═════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la correction...</p>
        </div>
      </div>
    );
  }

  if (error || !correction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Correction introuvable</h2>
          <p className="text-gray-600 mb-6">{error || 'Le lien de correction est invalide ou a expiré.'}</p>
          <button
            onClick={onGoHome}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ═════════════════════════════════════════════════════════════════

  const questions = correction.questions || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
     <div className="bg-gradient-to-r from-amber-600 to-yellow-700 text-white py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onGoHome}
              className="flex items-center gap-2 text-blue-100 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </button>
            <span className="text-blue-200 text-sm">
              {new Date(correction.createdAt || '').toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Correction détaillée</h1>
          <p className="text-blue-100">{correction.concoursName}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Informations du candidat */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Candidat
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Nom</p>
              <p className="font-medium">{correction.candidateName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Téléphone</p>
              <p className="font-medium">{correction.candidatePhone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Concours</p>
              <p className="font-medium">{correction.concoursName}</p>
            </div>
          </div>
        </div>

        {/* Score principal */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            {/* Cercle de score */}
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={(correction.percentage || 0) >= 50 ? '#22c55e' : '#ef4444'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(correction.percentage || 0) * 2.83} 283`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-gray-800">{correction.score}</span>
                <span className="text-sm text-gray-500">/ {correction.totalQuestions}</span>
              </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-600">{correction.correctCount}</div>
                <div className="text-sm text-green-700">Correctes</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-red-600">{correction.wrongCount}</div>
                <div className="text-sm text-red-700">Incorrectes</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-gray-600">{correction.unansweredCount}</div>
                <div className="text-sm text-gray-700">Sans réponse</div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance par matière */}
        {categoryPerformances.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Performance par matière
            </h2>
            <div className="space-y-3">
              {categoryPerformances.map(cat => (
                <div key={cat.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800">{cat.name}</span>
                    <span className={`text-sm font-bold ${
                      cat.percentage >= 70 ? 'text-green-600' : 
                      cat.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {cat.correct}/{cat.total} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cat.percentage >= 70 ? 'bg-green-500' : 
                        cat.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span className="text-green-600">{cat.correct} correcte(s)</span>
                    <span className="text-red-600">{cat.wrong} incorrecte(s)</span>
                    <span className="text-gray-500">{cat.unanswered} sans réponse</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bouton pour afficher les détails */}
        <div className="text-center mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <svg className={`w-5 h-5 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showDetails ? 'Masquer les détails' : 'Voir la correction détaillée'}
          </button>
        </div>

        {/* Détails des questions */}
        {showDetails && questions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Détail des réponses ({questions.length} questions)
            </h2>

            {questions.map((q: CorrectionQuestion, index: number) => {
              const userAnswers = q.user_answers || [];
              const correctAnswers = q.correct_answers || [];
              const options = q.options || [];
              const isUnanswered = userAnswers.length === 0;
              const isCorrect = q.is_correct;

              return (
                <div
                  key={q.id || index}
                  className={`bg-white rounded-xl shadow-md overflow-hidden border-l-4 ${
                    isUnanswered ? 'border-gray-400' :
                    isCorrect ? 'border-green-500' : 'border-red-500'
                  }`}
                >
                  {/* En-tête de la question */}
                  <div className={`px-4 py-3 flex items-center justify-between ${
                    isUnanswered ? 'bg-gray-100' :
                    isCorrect ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        isUnanswered ? 'bg-gray-400' :
                        isCorrect ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                        {categoryNames[q.category_id] || q.category_id}
                      </span>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      isUnanswered ? 'bg-gray-200 text-gray-600' :
                      isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {isUnanswered ? '0 pt' : isCorrect ? '+1 pt' : '-1 pt'}
                    </span>
                  </div>

                  {/* Contenu de la question */}
                  <div className="p-4">
                    {/* Texte de la question */}
                    <div className="mb-4 text-gray-800">
                      {q.has_latex ? (
                        <MathRenderer text={q.question_text} />
                      ) : (
                        <p>{q.question_text}</p>
                      )}
                    </div>

                    {/* Image si présente */}
                    {q.image_url && (
                      <div className="mb-4 flex justify-center">
                        <img
                          src={q.image_url}
                          alt="Illustration de la question"
                          className="max-w-full h-auto max-h-48 rounded-lg border"
                        />
                      </div>
                    )}

                    {/* Options */}
                    <div className="space-y-2">
                      {options.map((option: string, optIndex: number) => {
                        const isUserAnswer = userAnswers.includes(optIndex);
                        const isCorrectOption = correctAnswers.includes(optIndex);
                        const letter = String.fromCharCode(65 + optIndex); // A, B, C, D...

                        // Déterminer le style
                        let bgColor = 'bg-white';
                        let borderColor = 'border-gray-200';
                        let textColor = 'text-gray-700';

                        if (isCorrectOption && isUserAnswer) {
                          // Bonne réponse cochée ✅
                          bgColor = 'bg-green-100';
                          borderColor = 'border-green-400';
                          textColor = 'text-green-800';
                        } else if (isCorrectOption && !isUserAnswer) {
                          // Bonne réponse non cochée (oubliée) 🟢
                          bgColor = 'bg-green-50';
                          borderColor = 'border-green-300 border-dashed';
                          textColor = 'text-green-700';
                        } else if (!isCorrectOption && isUserAnswer) {
                          // Mauvaise réponse cochée ❌
                          bgColor = 'bg-red-100';
                          borderColor = 'border-red-400';
                          textColor = 'text-red-800';
                        }

                        return (
                          <div
                            key={optIndex}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 ${bgColor} ${borderColor} ${textColor}`}
                          >
                            {/* Lettre de l'option */}
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              isCorrectOption ? 'bg-green-500 text-white' :
                              isUserAnswer ? 'bg-red-500 text-white' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {letter}
                            </span>

                            {/* Texte de l'option */}
                            <div className="flex-1">
                              {q.has_latex ? (
                                <MathRenderer text={option} />
                              ) : (
                                <span>{option}</span>
                              )}
                            </div>

                            {/* Badges */}
                            <div className="flex gap-2">
                              {isUserAnswer && (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  isCorrectOption ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                                }`}>
                                  Votre choix
                                </span>
                              )}
                              {isCorrectOption && (
                                <span className="text-xs px-2 py-1 rounded-full bg-green-200 text-green-800">
                                  Bonne réponse
                                </span>
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
        )}

        {/* Bouton retour */}
        <div className="text-center mt-8">
          <button
            onClick={onGoHome}
            className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}
