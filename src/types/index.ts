// Types de catégories disponibles (extensibles)
export type Category = 
  | 'francais' 
  | 'maths' 
  | 'physique' 
  | 'svt' 
  | 'chimie'
  | 'psychotechnique' 
  | 'culture' 
  | 'histoire' 
  | 'geographie'
  | 'droit_constitutionnel' 
  | 'droit_administratif' 
  | 'droit_penal'
  | 'droit_civil'
  | 'economie' 
  | 'comptabilite' 
  | 'fiscalite' 
  | 'informatique'
  | 'anglais' 
  | 'philosophie' 
  | 'sport'
  | 'pedagogie'
  | 'didactique'
  | 'psychologie'
  | 'biologie' 
  | 'anatomie' 
  | 'pharmacologie' 
  | 'soins_infirmiers'
  | 'sante_publique'
  | 'secourisme'
  | 'education_civique'
  | 'logique'
  | 'raisonnement';

// Configuration d'une matière/catégorie pour un concours
export interface CategoryConfig {
  id: Category;
  name: string;
  nameShort?: string; // Nom court pour l'affichage mobile
  questionsCount: number; // Nombre de questions pour cette matière
  order?: number; // Ordre d'affichage
}

export interface Question {
  id: number;
  category: Category;
  question: string;
  options: string[];
  correctAnswers: number[]; // Index des bonnes réponses (peut en avoir plusieurs)
  image?: string; // Chemin vers l'image (optionnel)
  imageAlt?: string; // Description de l'image pour accessibilité
  imagePosition?: 'above' | 'below' | 'inline'; // Position de l'image
  hasLatex?: boolean; // Indique si la question contient des formules LaTeX
}

export interface Concours {
  id: string;
  name: string;
  description: string;
  icon: string;
  categories: CategoryConfig[]; // Matières de ce concours avec le nombre de questions
  questions: Question[]; // Questions propres à ce concours
  duration: number; // en minutes
  totalQuestions?: number; // Nombre total de questions (optionnel)
  available: boolean; // Indique si le concours est disponible
}

export interface UserInfo {
  nom: string;
  prenom: string;
  telephone: string;
}

export interface UserAnswer {
  questionId: number;
  selectedOptions: number[];
  correctOptions?: number[]; // Les bonnes réponses pour cette question
  isCorrect?: boolean; // Si la réponse est correcte
  points?: number; // Points obtenus pour cette question (+1, -1, ou 0)
}

export interface QuizResult {
  user: UserInfo;
  concours: string;
  answers: UserAnswer[];
  score: number;
  totalQuestions: number;
  bonnesReponses: number;
  mauvaisesReponses: number;
  sansReponse: number;
  duration: number;
  submittedAt: Date;
  isCustomExam?: boolean; // Indique si c'est un examen généré personnalisé
  questions?: Question[]; // Les questions de l'examen (pour afficher la correction)
  submissionId?: string; // ID de la soumission Supabase (pour récupérer la correction)
}

export type Theme = 'green' | 'blue' | 'purple' | 'orange' | 'red';

export type AppMode = 'concours' | 'examen' | 'custom';

export interface CustomExamConfig {
  numberOfQuestions: number;
  duration: number;
  categories: Category[];
}
