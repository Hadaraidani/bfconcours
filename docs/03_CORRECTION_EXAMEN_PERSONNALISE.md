# Correction pour les examens personnalisés

## Problème identifié

Les examens personnalisés (option "Générer mon examen") n'affichaient pas correctement :
1. Le calcul du score
2. La correction détaillée avec les bonnes/mauvaises réponses

## Cause du problème

Les questions chargées depuis Supabase via la vue `questions_public` n'incluent **pas** le champ `correct_answers` (pour des raisons de sécurité). 

Quand l'utilisateur génère un examen personnalisé, les questions venaient de Supabase et n'avaient donc pas les `correctAnswers` nécessaires pour :
- Calculer le score localement
- Afficher la correction détaillée

## Solution implémentée

### Modification de App.tsx

Le `CustomExamGenerator` utilise maintenant les **données locales** (`localConcoursData`) au lieu des données Supabase :

```tsx
if (step === 'customExam') {
  // Pour les examens personnalisés, on utilise les données LOCALES
  // car elles contiennent les correctAnswers nécessaires au calcul du score
  return (
    <div className="flex flex-col min-h-screen">
      <Header ... />
      <CustomExamGenerator 
        concoursData={localConcoursData}  // ← Données locales avec correctAnswers
        onGenerate={handleCustomExamGenerate} 
        onBack={() => setStep('concoursSelection')} 
        theme={theme} 
      />
    </div>
  );
}
```

## Comment ça fonctionne maintenant

### Examens officiels (Concours)
1. Questions chargées depuis Supabase (SANS `correct_answers`)
2. Score calculé par la fonction RPC `submit_quiz` **côté serveur**
3. Correction accessible via le lien envoyé par email

### Examens personnalisés
1. Questions prises depuis le fichier **local** `questions.ts` (AVEC `correctAnswers`)
2. Score calculé par la fonction `calculateScoreLocally` **côté client**
3. Correction affichée **immédiatement** sur la page de résultats

## Flux de données

```
┌─────────────────────────────────────────────────────────────┐
│                  EXAMENS OFFICIELS                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Supabase (questions_public)                               │
│   → Questions SANS correctAnswers                           │
│   → Score calculé CÔTÉ SERVEUR (submit_quiz RPC)            │
│   → Email avec lien de correction                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                EXAMENS PERSONNALISÉS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   questions.ts (données locales)                            │
│   → Questions AVEC correctAnswers                           │
│   → Score calculé CÔTÉ CLIENT (calculateScoreLocally)       │
│   → Résultats affichés immédiatement                        │
│   → Pas d'envoi à l'administrateur                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Affichage de la correction

Pour les examens personnalisés, la correction s'affiche avec le code couleur suivant :

| Situation | Couleur | Style |
|-----------|---------|-------|
| ✅ Bonne réponse cochée | Vert foncé | `bg-green-100 border-green-400` |
| 🟢 Bonne réponse oubliée | Vert clair pointillé | `bg-green-50 border-green-300 border-dashed` |
| ❌ Mauvaise réponse cochée | Rouge | `bg-red-100 border-red-400` |
| ⬜ Réponse non sélectionnée | Blanc/Gris | `bg-white border-gray-200` |

## Vérification

Pour vérifier que tout fonctionne :

1. **Générer un examen personnalisé** depuis la page de sélection des concours
2. **Répondre aux questions** et soumettre
3. **Vérifier le score** affiché immédiatement
4. **Cliquer sur "Voir la correction détaillée"**
5. **Vérifier** que les bonnes réponses sont en vert et les mauvaises en rouge

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/App.tsx` | `CustomExamGenerator` utilise `localConcoursData` au lieu de `concoursData` |
