import { useState, useMemo } from 'react';
import { Theme, Concours, Category, CategoryConfig } from '../types';
import { SITE_CONFIG } from '../config/site';

interface CustomExamGeneratorProps {
  concoursData: Concours[];
  onGenerate: (concours: Concours) => void;
  onBack: () => void;
  theme: Theme;
}

export function CustomExamGenerator({ concoursData, onGenerate, onBack, theme }: CustomExamGeneratorProps) {
  const [numberOfQuestions, setNumberOfQuestions] = useState(20);
  const [duration, setDuration] = useState(45);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'francais', 'maths', 'physique', 'svt', 'psychotechnique', 'culture', 'histoire'
  ]);

  // Obtenir toutes les questions de tous les concours
  const allQuestions = useMemo(() => {
    return concoursData.flatMap(c => c.questions);
  }, [concoursData]);

  // Obtenir toutes les catégories uniques avec leurs labels
  const allCategoriesWithLabels = useMemo(() => {
    const categoryMap = new Map<string, string>();
    
    concoursData.forEach(concours => {
      concours.categories.forEach(cat => {
        if (!categoryMap.has(cat.id)) {
          categoryMap.set(cat.id, cat.name);
        }
      });
    });
    
    return Array.from(categoryMap.entries()).map(([id, name]) => ({ id, name }));
  }, [concoursData]);

  const getThemeColors = () => {
    switch (theme) {
      case 'blue':
        return { button: 'bg-blue-600 hover:bg-blue-700', checkbox: 'text-blue-600' };
      case 'purple':
        return { button: 'bg-purple-600 hover:bg-purple-700', checkbox: 'text-purple-600' };
      case 'orange':
        return { button: 'bg-orange-600 hover:bg-orange-700', checkbox: 'text-orange-600' };
      case 'red':
        return { button: 'bg-red-600 hover:bg-red-700', checkbox: 'text-red-600' };
      default:
        return { button: 'bg-emerald-600 hover:bg-emerald-700', checkbox: 'text-emerald-600' };
    }
  };

  const colors = getThemeColors();

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        if (prev.length > 1) {
          return prev.filter(c => c !== category);
        }
        return prev; // Au moins une catégorie doit être sélectionnée
      }
      return [...prev, category];
    });
  };

  const generateExam = () => {
    // Filtrer les questions par catégories sélectionnées
    const filteredQuestions = allQuestions.filter(q => 
      selectedCategories.includes(q.category)
    );

    // Mélanger les questions
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);

    // Prendre le nombre de questions demandé
    const selectedQuestions = shuffled.slice(0, Math.min(numberOfQuestions, shuffled.length));

    // Réassigner les IDs
    const questionsWithNewIds = selectedQuestions.map((q, index) => ({
      ...q,
      id: index + 1
    }));

    // Calculer les catégories utilisées
    const usedCategories: CategoryConfig[] = selectedCategories.map(catId => {
      const catInfo = allCategoriesWithLabels.find(c => c.id === catId);
      return {
        id: catId as Category,
        name: catInfo?.name || catId,
        questionsCount: questionsWithNewIds.filter(q => q.category === catId).length
      };
    }).filter(c => c.questionsCount > 0);

    // Créer le concours personnalisé
    const customConcours: Concours = {
      id: 'custom-exam',
      name: 'Examen Personnalisé',
      description: `Examen généré avec ${questionsWithNewIds.length} questions`,
      icon: 'EP',
      categories: usedCategories,
      questions: questionsWithNewIds,
      duration: duration,
      available: true,
    };

    onGenerate(customConcours);
  };

  const availableQuestionsCount = allQuestions.filter(q => 
    selectedCategories.includes(q.category)
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Bouton retour */}
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Retour</span>
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Générer mon examen</h2>
            <p className="text-sm sm:text-base text-gray-500 mt-2">
              Personnalisez votre QCM selon vos besoins
            </p>
          </div>

          {/* Nombre de questions */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de questions : <span className="font-bold text-lg">{numberOfQuestions}</span>
            </label>
            <input
              type="range"
              min="5"
              max={SITE_CONFIG.maxCustomQuestions}
              value={numberOfQuestions}
              onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5</span>
              <span>{SITE_CONFIG.maxCustomQuestions} (max)</span>
            </div>
            {numberOfQuestions > availableQuestionsCount && (
              <p className="text-sm text-amber-600 mt-2">
                Seulement {availableQuestionsCount} questions disponibles avec les catégories sélectionnées
              </p>
            )}
          </div>

          {/* Durée */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durée de l'examen
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {SITE_CONFIG.availableDurations.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    duration === d
                      ? `${colors.button} text-white`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Catégories */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Catégories de questions
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allCategoriesWithLabels.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                const questionCount = allQuestions.filter(q => q.category === cat.id).length;
                
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-50 border-2 border-emerald-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${
                        isSelected ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-emerald-700' : 'text-gray-600'}`}>
                        {cat.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 ml-7">{questionCount} questions</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Résumé */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h4 className="font-medium text-gray-700 mb-2">Résumé de l'examen</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Questions :</span>
                <span className="font-bold ml-2">{Math.min(numberOfQuestions, availableQuestionsCount)}</span>
              </div>
              <div>
                <span className="text-gray-500">Durée :</span>
                <span className="font-bold ml-2">{duration} min</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Catégories :</span>
                <span className="font-bold ml-2">{selectedCategories.length}</span>
              </div>
            </div>
          </div>

          {/* Bouton générer */}
          <button
            onClick={generateExam}
            className={`w-full ${colors.button} text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2 text-lg`}
          >
            <span>Générer l'examen</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
