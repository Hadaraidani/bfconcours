# Guide de gestion des concours et matières

Ce guide explique comment ajouter, modifier ou supprimer des concours et des matières dans le système QCM.

## Table des matières

1. [Structure des données](#structure-des-données)
2. [Ajouter un nouveau concours](#ajouter-un-nouveau-concours)
3. [Modifier les matières d'un concours](#modifier-les-matières-dun-concours)
4. [Ajouter ou diminuer le nombre de matières](#ajouter-ou-diminuer-le-nombre-de-matières)
5. [Rendre un concours indisponible](#rendre-un-concours-indisponible)
6. [Exemples complets](#exemples-complets)

---

## Structure des données

Chaque concours est défini dans le fichier `src/data/questions.ts` avec la structure suivante :

```typescript
const concoursData: Concours[] = [
  {
    id: 'identifiant-unique',          // ID unique du concours
    name: 'Nom du Concours',            // Nom affiché
    description: 'Description...',      // Description du concours
    icon: 'ICON',                       // Icône/acronyme (max 5 caractères)
    categories: [...],                   // Liste des matières
    questions: [...],                    // Liste des questions
    duration: 90,                        // Durée en minutes
    available: true,                     // true = disponible, false = indisponible
  },
];
```

### Structure d'une matière (category)

```typescript
{
  id: 'nom_matiere',           // ID technique (sans accent, minuscule)
  name: 'Nom de la Matière',   // Nom affiché
  questionsCount: 10,          // Nombre de questions pour cette matière
}
```

### Structure d'une question

```typescript
{
  id: 1,                              // ID unique de la question (dans le concours)
  category: 'nom_matiere',            // Doit correspondre à un ID de catégorie
  question: "Texte de la question",   // La question
  options: ["A", "B", "C", "D"],      // Les options de réponse
  correctAnswers: [0],                // Index des bonnes réponses (0 = A, 1 = B, etc.)
  hasLatex: false,                    // true si la question contient des formules LaTeX
  image: '/images/photo.png',         // (optionnel) chemin vers une image
}
```

---

## Ajouter un nouveau concours

### Étape 1 : Définir les matières

```typescript
const nouveauConcoursCategories: CategoryConfig[] = [
  { id: 'francais', name: 'Français', questionsCount: 15 },
  { id: 'maths', name: 'Mathématiques', questionsCount: 15 },
  { id: 'informatique', name: 'Informatique', questionsCount: 10 },
  { id: 'anglais', name: 'Anglais', questionsCount: 10 },
];
// Total : 50 questions
```

### Étape 2 : Créer les questions

```typescript
const nouveauConcoursQuestions: Question[] = [
  // FRANÇAIS (15 questions)
  { id: 1, category: 'francais', question: "Question 1...", options: ["A", "B", "C", "D"], correctAnswers: [0] },
  { id: 2, category: 'francais', question: "Question 2...", options: ["A", "B", "C", "D"], correctAnswers: [1] },
  // ... 15 questions de français au total
  
  // MATHÉMATIQUES (15 questions)
  { id: 16, category: 'maths', question: "Question 16...", options: ["A", "B", "C", "D"], correctAnswers: [2] },
  // ... 15 questions de maths
  
  // INFORMATIQUE (10 questions)
  { id: 31, category: 'informatique', question: "Question 31...", options: ["A", "B", "C", "D"], correctAnswers: [0] },
  // ... 10 questions d'informatique
  
  // ANGLAIS (10 questions)
  { id: 41, category: 'anglais', question: "Question 41...", options: ["A", "B", "C", "D"], correctAnswers: [3] },
  // ... 10 questions d'anglais
];
```

### Étape 3 : Ajouter le concours à la liste

```typescript
export const concoursData: Concours[] = [
  // ... autres concours existants
  
  {
    id: 'nouveau-concours',
    name: 'Nouveau Concours - Spécialité',
    description: 'Description du nouveau concours - 50 questions',
    icon: 'NC',
    categories: nouveauConcoursCategories,
    questions: nouveauConcoursQuestions,
    duration: 90, // 1h30
    available: true,
  },
];
```

---

## Modifier les matières d'un concours

Pour modifier les matières d'un concours existant, vous devez :

1. **Modifier le tableau `categories`** du concours
2. **Mettre à jour les questions** pour correspondre aux nouvelles matières

### Exemple : Ajouter une matière à l'ENAM

**Avant :**
```typescript
const enamCategories: CategoryConfig[] = [
  { id: 'francais', name: 'Français', questionsCount: 10 },
  { id: 'droit_constitutionnel', name: 'Droit Constitutionnel', questionsCount: 10 },
  // ...
];
```

**Après (ajout de Géographie) :**
```typescript
const enamCategories: CategoryConfig[] = [
  { id: 'francais', name: 'Français', questionsCount: 10 },
  { id: 'droit_constitutionnel', name: 'Droit Constitutionnel', questionsCount: 10 },
  { id: 'geographie', name: 'Géographie', questionsCount: 8 }, // NOUVELLE MATIÈRE
  // ...
];
```

**Puis ajouter les questions de géographie :**
```typescript
const enamQuestions: Question[] = [
  // ... questions existantes
  
  // GÉOGRAPHIE (8 questions) - NOUVELLES
  { id: 57, category: 'geographie', question: "Quelle est la superficie du Burkina Faso ?", options: ["274 200 km²", "312 000 km²", "196 700 km²", "245 000 km²"], correctAnswers: [0] },
  // ... 8 questions de géographie
];
```

---

## Ajouter ou diminuer le nombre de matières

### Pour AJOUTER une matière

1. Ajoutez l'entrée dans le tableau `categories`
2. Créez les questions correspondantes avec la bonne valeur `category`
3. Si la matière n'existe pas dans les types, ajoutez-la dans `src/types/index.ts` :

```typescript
// Dans src/types/index.ts
export type Category = 
  | 'francais' 
  | 'maths' 
  | 'votre_nouvelle_matiere'  // AJOUTER ICI
  // ...
```

### Pour SUPPRIMER une matière

1. Supprimez l'entrée du tableau `categories`
2. Supprimez toutes les questions de cette matière du tableau `questions`

**Exemple : Supprimer la matière "Informatique" de l'ENAM**

```typescript
// AVANT
const enamCategories: CategoryConfig[] = [
  { id: 'francais', name: 'Français', questionsCount: 10 },
  { id: 'informatique', name: 'Informatique', questionsCount: 3 }, // À SUPPRIMER
];

// APRÈS
const enamCategories: CategoryConfig[] = [
  { id: 'francais', name: 'Français', questionsCount: 10 },
  // informatique supprimé
];

// Supprimer aussi les questions 54, 55, 56 qui ont category: 'informatique'
```

---

## Rendre un concours indisponible

Pour rendre un concours temporairement indisponible (sans le supprimer) :

```typescript
{
  id: 'ensep',
  name: 'ENSEP - Éducation Physique',
  // ...
  available: false,  // <-- Mettre à false
}
```

Le concours apparaîtra grisé avec un badge "Indisponible" et ne sera pas cliquable.

---

## Exemples complets

### Exemple 1 : Concours avec 3 matières et 30 questions

```typescript
// Définition des matières
const exempleCategories: CategoryConfig[] = [
  { id: 'francais', name: 'Français', questionsCount: 10 },
  { id: 'maths', name: 'Mathématiques', questionsCount: 10 },
  { id: 'culture', name: 'Culture Générale', questionsCount: 10 },
];

// Questions
const exempleQuestions: Question[] = [
  // 10 questions de français (id 1-10)
  { id: 1, category: 'francais', question: "...", options: ["A", "B", "C", "D"], correctAnswers: [0] },
  // ...
  
  // 10 questions de maths (id 11-20)
  { id: 11, category: 'maths', question: "...", options: ["A", "B", "C", "D"], correctAnswers: [1] },
  // ...
  
  // 10 questions de culture (id 21-30)
  { id: 21, category: 'culture', question: "...", options: ["A", "B", "C", "D"], correctAnswers: [2] },
  // ...
];

// Le concours
{
  id: 'exemple',
  name: 'Concours Exemple',
  description: 'Un exemple de concours avec 30 questions',
  icon: 'EX',
  categories: exempleCategories,
  questions: exempleQuestions,
  duration: 45, // 45 minutes
  available: true,
}
```

### Exemple 2 : Question avec image et formule LaTeX

```typescript
{
  id: 42,
  category: 'maths',
  question: "Soit la fonction $f(x) = x^2 - 4x + 3$. Observez le graphique ci-dessous et déterminez les racines de $f$.",
  options: ["$x = 1$ et $x = 3$", "$x = 2$ et $x = 4$", "$x = 0$ et $x = 3$", "$x = 1$ et $x = 2$"],
  correctAnswers: [0],
  hasLatex: true,
  image: '/images/parabole.png',
  imageAlt: 'Graphique de la fonction f(x)',
  imagePosition: 'below',
}
```

### Exemple 3 : Question à choix multiples

```typescript
{
  id: 15,
  category: 'svt',
  question: "Quels sont les organes du système digestif ? (Plusieurs réponses possibles)",
  options: ["Estomac", "Poumons", "Intestin grêle", "Foie", "Cœur", "Pancréas"],
  correctAnswers: [0, 2, 3, 5], // Estomac, Intestin, Foie, Pancréas
}
```

---

## Récapitulatif des concours actuels

| Concours | Questions | Matières | Durée | Disponible |
|----------|-----------|----------|-------|------------|
| ENAM | 56 | 7 | 120 min | Oui |
| ENAREF | 44 | 6 | 90 min | Oui |
| ENSP | 50 | 5 | 90 min | Oui |
| Santé | 45 | 5 | 90 min | Oui |
| ENSEP | 40 | 5 | 75 min | Non |

---

## Matières disponibles

Voici la liste des matières (catégories) disponibles dans le système :

| ID | Nom affiché |
|----|-------------|
| `francais` | Français |
| `maths` | Mathématiques |
| `physique` | Physique |
| `svt` | SVT |
| `chimie` | Chimie |
| `culture` | Culture Générale |
| `histoire` | Histoire |
| `geographie` | Géographie |
| `droit_constitutionnel` | Droit Constitutionnel |
| `droit_administratif` | Droit Administratif |
| `droit_penal` | Droit Pénal |
| `droit_civil` | Droit Civil |
| `economie` | Économie |
| `comptabilite` | Comptabilité |
| `fiscalite` | Fiscalité |
| `informatique` | Informatique |
| `anglais` | Anglais |
| `sport` | Sport |
| `pedagogie` | Pédagogie |
| `psychologie` | Psychologie |
| `biologie` | Biologie |
| `anatomie` | Anatomie |
| `pharmacologie` | Pharmacologie |
| `soins_infirmiers` | Soins Infirmiers |
| `psychotechnique` | Psychotechnique |

Pour ajouter une nouvelle matière, modifiez le type `Category` dans `src/types/index.ts`.
