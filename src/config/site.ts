// Configuration générale du site
// Modifiez ces valeurs pour personnaliser le comportement du site

import { Theme, AppMode } from '../types';

export const SITE_CONFIG = {
  // Mode du site
  // 'concours' = Affiche tous les concours disponibles
  // 'examen' = Affiche uniquement l'examen d'évaluation
  // 'custom' = Permet à l'utilisateur de générer son propre examen
  mode: 'concours' as AppMode,

  // Thème par défaut
  defaultTheme: 'green' as Theme,

  // Permettre le changement de thème
  allowThemeChange: true,

  // Permettre la génération d'examen personnalisé
  allowCustomExam: true,

  // Afficher les concours indisponibles (grisés)
  showUnavailableConcours: true,

  // Configuration de l'examen unique (mode 'examen')
  singleExam: {
    id: 'evaluation',
    name: "Examen d'Évaluation",
    description: "Test d'évaluation général pour préparer les concours",
    duration: 60,
  },

  // Nombre maximum de questions pour examen personnalisé
  maxCustomQuestions: 25,

  // Durées disponibles pour examen personnalisé (en minutes)
  availableDurations: [15, 30, 45, 60, 90],
};

// Configuration des thèmes
export const THEME_CONFIG = {
  green: {
    name: 'Vert (Burkina)',
    primary: 'emerald',
    gradient: 'from-emerald-600 via-green-600 to-teal-600',
    lightGradient: 'from-emerald-50 to-green-50',
    accent: 'yellow',
  },
  blue: {
    name: 'Bleu Professionnel',
    primary: 'blue',
    gradient: 'from-blue-600 via-indigo-600 to-blue-700',
    lightGradient: 'from-blue-50 to-indigo-50',
    accent: 'yellow',
  },
  purple: {
    name: 'Violet Moderne',
    primary: 'purple',
    gradient: 'from-purple-600 via-violet-600 to-purple-700',
    lightGradient: 'from-purple-50 to-violet-50',
    accent: 'pink',
  },
  orange: {
    name: 'Orange Dynamique',
    primary: 'orange',
    gradient: 'from-orange-500 via-amber-500 to-orange-600',
    lightGradient: 'from-orange-50 to-amber-50',
    accent: 'red',
  },
  red: {
    name: 'Rouge Vif',
    primary: 'red',
    gradient: 'from-red-600 via-rose-600 to-red-700',
    lightGradient: 'from-red-50 to-rose-50',
    accent: 'yellow',
  },
};
