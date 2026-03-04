import { Concours, Theme } from '../types';
import { SITE_CONFIG } from '../config/site';

interface ConcoursSelectionProps {
  concoursData: Concours[];
  onSelect: (concours: Concours) => void;
  onBack: () => void;
  onGenerateCustom?: () => void;
  theme: Theme;
}

export function ConcoursSelection({ concoursData, onSelect, onBack, onGenerateCustom, theme }: ConcoursSelectionProps) {
  const getThemeColors = () => {
    switch (theme) {
      case 'blue':
        return { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' };
      case 'purple':
        return { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-600', gradient: 'from-purple-500 to-purple-600' };
      case 'orange':
        return { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-600', gradient: 'from-orange-500 to-orange-600' };
      case 'red':
        return { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-600', gradient: 'from-red-500 to-red-600' };
      default:
        return { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-600' };
    }
  };

  const colors = getThemeColors();

  // Filtrer les concours selon la config
  const displayedConcours = SITE_CONFIG.showUnavailableConcours 
    ? concoursData 
    : concoursData.filter(c => c.available);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 sm:py-12 px-4">
      <div className="max-w-5xl mx-auto">
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

        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Sélectionnez un concours
          </h2>
          <p className="text-sm sm:text-base text-gray-500">
            Chaque concours possède ses propres questions et matières
          </p>
        </div>

        {/* Option Générer mon examen */}
        {SITE_CONFIG.allowCustomExam && onGenerateCustom && (
          <div className="mb-8">
            <button
              onClick={onGenerateCustom}
              className={`w-full p-4 sm:p-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg sm:text-xl font-bold">Générer mon examen</h3>
                    <p className="text-sm text-white/80">Créez un QCM personnalisé avec toutes les questions</p>
                  </div>
                </div>
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </button>
          </div>
        )}

        {/* Grille des concours */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {displayedConcours.map((concours) => (
            <div
              key={concours.id}
              onClick={() => concours.available && onSelect(concours)}
              className={`relative bg-white rounded-2xl shadow-md overflow-hidden transition-all ${
                concours.available
                  ? `hover:shadow-xl hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:${colors.border}`
                  : 'opacity-60 cursor-not-allowed border-2 border-gray-200'
              }`}
            >
              {/* Badge indisponible */}
              {!concours.available && (
                <div className="absolute top-3 right-3 bg-gray-500 text-white text-xs px-2 py-1 rounded-full z-10">
                  Indisponible
                </div>
              )}

              {/* En-tête du concours */}
              <div className={`p-4 sm:p-5 ${concours.available ? `bg-gradient-to-r ${colors.gradient}` : 'bg-gray-400'} text-white`}>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold">{concours.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold truncate">
                      {concours.name}
                    </h3>
                    <p className="text-sm text-white/80 truncate">
                      {concours.questions.length} questions - {concours.duration} min
                    </p>
                  </div>
                </div>
              </div>

              {/* Corps avec les matières */}
              <div className="p-4 sm:p-5">
                <p className="text-sm text-gray-600 mb-3">
                  {concours.description}
                </p>

                {/* Liste des matières */}
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Matières évaluées ({concours.categories.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {concours.categories.map((cat) => (
                      <span
                        key={cat.id}
                        className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${
                          concours.available 
                            ? `${colors.bg} ${colors.text}` 
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <span className="font-medium">{cat.name}</span>
                        <span className="ml-1 opacity-70">({cat.questionsCount})</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bouton commencer */}
                {concours.available && (
                  <div className={`flex items-center justify-between pt-3 border-t border-gray-100`}>
                    <span className="text-sm text-gray-500">Cliquez pour commencer</span>
                    <div className={`${colors.text} flex items-center space-x-1`}>
                      <span className="text-sm font-medium">Démarrer</span>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium">À propos des concours</p>
              <p className="mt-1 text-blue-700">
                Chaque concours dispose de ses propres questions spécifiques. Les questions de l'ENAM sont différentes de celles de l'ENAREF, etc. 
                Le nombre de questions et les matières varient selon le concours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
