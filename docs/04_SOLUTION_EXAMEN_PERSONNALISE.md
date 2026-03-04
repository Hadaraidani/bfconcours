# Solution pour les Examens Personnalisés en Production

## Le Problème

### Situation actuelle

```
┌─────────────────────────────────────────────────────────────┐
│  DÉVELOPPEMENT LOCAL                                        │
│  ─────────────────────────────────────────────────────────  │
│  • questions.ts contient les correctAnswers                 │
│  • CustomExamGenerator utilise localConcoursData            │
│  • Le calcul du score fonctionne localement                 │
│  ✅ Tout fonctionne !                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PRODUCTION (SUPABASE)                                      │
│  ─────────────────────────────────────────────────────────  │
│  • questions_public ne contient PAS correct_answers         │
│  • localConcoursData peut être désynchronisé                │
│  • Si on utilise localConcoursData, il peut ne pas          │
│    correspondre aux questions dans Supabase                 │
│  ❌ Problème potentiel !                                    │
└─────────────────────────────────────────────────────────────┘
```

### Scénarios problématiques

1. **Désynchronisation** : Vous ajoutez des questions dans Supabase directement, mais `questions.ts` n'est pas mis à jour
2. **Incohérence** : Les IDs des questions dans Supabase peuvent différer de ceux dans `questions.ts`
3. **Maintenance** : Devoir maintenir deux sources de données (Supabase + questions.ts)

---

## La Solution : Fonction RPC `submit_custom_exam`

### Principe

Au lieu de calculer le score localement avec `localConcoursData`, on crée une **fonction RPC Supabase** qui :

1. Reçoit les IDs des questions et les réponses de l'utilisateur
2. Calcule le score **côté serveur** (où les `correct_answers` sont disponibles)
3. Retourne le score ET la correction complète

### Avantages

| Aspect | Bénéfice |
|--------|----------|
| **Sécurité** | `correct_answers` jamais exposé au frontend |
| **Synchronisation** | Utilise toujours les données de Supabase |
| **Cohérence** | Une seule source de vérité |
| **Maintenance** | Pas besoin de synchroniser deux fichiers |

---

## Implémentation

### Étape 1 : Ajouter la fonction RPC dans Supabase

Exécutez ce script dans **Supabase → SQL Editor** :

```sql
-- ═══════════════════════════════════════════════════════════════════
-- FONCTION POUR LES EXAMENS PERSONNALISÉS
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION submit_custom_exam(
  p_candidate_name TEXT,
  p_candidate_phone TEXT,
  p_question_ids INTEGER[],
  p_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_question RECORD;
  v_answer JSONB;
  v_user_selected INTEGER[];
  v_correct_answers INTEGER[];
  v_is_correct BOOLEAN;
  v_score INTEGER := 0;
  v_correct_count INTEGER := 0;
  v_wrong_count INTEGER := 0;
  v_unanswered_count INTEGER := 0;
  v_total INTEGER;
  v_correction JSONB := '[]'::JSONB;
  v_submission_id UUID;
BEGIN
  -- Compter le total de questions
  v_total := array_length(p_question_ids, 1);
  
  IF v_total IS NULL OR v_total = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Aucune question fournie'
    );
  END IF;

  -- Générer un ID de soumission
  v_submission_id := gen_random_uuid();

  -- Parcourir chaque question
  FOR v_question IN 
    SELECT id, question_text, options, correct_answers, category_id
    FROM questions 
    WHERE id = ANY(p_question_ids)
  LOOP
    -- Récupérer la réponse de l'utilisateur
    v_answer := NULL;
    FOR i IN 0..jsonb_array_length(p_answers) - 1 LOOP
      IF (p_answers->i->>'question_id')::INTEGER = v_question.id THEN
        v_answer := p_answers->i;
        EXIT;
      END IF;
    END LOOP;

    -- Extraire les réponses sélectionnées
    IF v_answer IS NOT NULL AND v_answer->'selected_options' IS NOT NULL THEN
      SELECT array_agg(val::INTEGER)
      INTO v_user_selected
      FROM jsonb_array_elements_text(v_answer->'selected_options') AS val;
    ELSE
      v_user_selected := NULL;
    END IF;

    -- Récupérer les bonnes réponses
    SELECT array_agg(val::INTEGER)
    INTO v_correct_answers
    FROM jsonb_array_elements_text(to_jsonb(v_question.correct_answers)) AS val;

    -- Calculer si correct
    IF v_user_selected IS NULL OR array_length(v_user_selected, 1) IS NULL THEN
      v_is_correct := false;
      v_unanswered_count := v_unanswered_count + 1;
      -- Pas de changement de score pour non répondu
    ELSE
      -- Trier les tableaux pour comparer
      SELECT array_agg(x ORDER BY x) INTO v_user_selected FROM unnest(v_user_selected) x;
      SELECT array_agg(x ORDER BY x) INTO v_correct_answers FROM unnest(v_correct_answers) x;
      
      v_is_correct := (v_user_selected = v_correct_answers);
      
      IF v_is_correct THEN
        v_score := v_score + 1;
        v_correct_count := v_correct_count + 1;
      ELSE
        v_score := v_score - 1;
        v_wrong_count := v_wrong_count + 1;
      END IF;
    END IF;

    -- Ajouter à la correction
    v_correction := v_correction || jsonb_build_object(
      'id', v_question.id,
      'question_text', v_question.question_text,
      'options', v_question.options,
      'category_id', v_question.category_id,
      'user_answers', COALESCE(v_user_selected, ARRAY[]::INTEGER[]),
      'correct_answers', v_question.correct_answers,
      'is_correct', v_is_correct
    );
  END LOOP;

  -- Sauvegarder la soumission
  INSERT INTO quiz_submissions (
    id,
    candidate_name,
    candidate_phone,
    concours_id,
    score,
    total_questions,
    correct_count,
    wrong_count,
    unanswered_count,
    correction_data
  ) VALUES (
    v_submission_id,
    p_candidate_name,
    p_candidate_phone,
    'custom-exam',
    v_score,
    v_total,
    v_correct_count,
    v_wrong_count,
    v_unanswered_count,
    jsonb_build_object('questions', v_correction)
  );

  -- Retourner le résultat
  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'score', v_score,
    'total', v_total,
    'correct_count', v_correct_count,
    'wrong_count', v_wrong_count,
    'unanswered_count', v_unanswered_count,
    'percentage', ROUND((v_correct_count::NUMERIC / v_total) * 100, 1),
    'correction', v_correction
  );
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION submit_custom_exam TO anon, authenticated;
```

### Étape 2 : Mettre à jour le service quizService.ts

Ajoutez cette fonction dans `src/services/quizService.ts` :

```typescript
// Soumettre un examen personnalisé via Supabase
export async function submitCustomExam(params: {
  candidateName: string;
  candidatePhone: string;
  questionIds: number[];
  answers: Array<{ question_id: number; selected_options: number[] }>;
}): Promise<{
  success: boolean;
  submissionId?: string;
  score?: number;
  total?: number;
  correctCount?: number;
  wrongCount?: number;
  unansweredCount?: number;
  percentage?: number;
  correction?: Array<{
    id: number;
    question_text: string;
    options: string[];
    category_id: string;
    user_answers: number[];
    correct_answers: number[];
    is_correct: boolean;
  }>;
  error?: string;
}> {
  if (!supabase) {
    console.warn('⚠️ Supabase non configuré, calcul local requis');
    return { success: false, error: 'Supabase non configuré' };
  }

  try {
    console.log('📤 Soumission examen personnalisé à Supabase...');
    
    const { data, error } = await supabase.rpc('submit_custom_exam', {
      p_candidate_name: params.candidateName,
      p_candidate_phone: params.candidatePhone,
      p_question_ids: params.questionIds,
      p_answers: params.answers
    });

    if (error) {
      console.error('❌ Erreur RPC submit_custom_exam:', error);
      return { success: false, error: error.message };
    }

    console.log('📥 Résultat submit_custom_exam:', data);

    if (data && data.success) {
      return {
        success: true,
        submissionId: data.submission_id,
        score: data.score,
        total: data.total,
        correctCount: data.correct_count,
        wrongCount: data.wrong_count,
        unansweredCount: data.unanswered_count,
        percentage: data.percentage,
        correction: data.correction
      };
    }

    return { success: false, error: data?.error || 'Erreur inconnue' };
  } catch (err) {
    console.error('❌ Erreur submitCustomExam:', err);
    return { success: false, error: String(err) };
  }
}
```

### Étape 3 : Mettre à jour App.tsx

Modifiez la fonction `handleQuizSubmit` pour utiliser `submitCustomExam` :

```typescript
// Dans handleQuizSubmit, section "examen personnalisé"
if (isCustomExam) {
  // Essayer d'abord avec Supabase
  if (isSupabaseConfigured) {
    const questionIds = selectedConcours.questions.map(q => q.id);
    const formattedAnswers = answers.map(a => ({
      question_id: a.questionId,
      selected_options: a.selectedOptions
    }));

    const supabaseResult = await submitCustomExam({
      candidateName: `${userInfo.prenom} ${userInfo.nom}`,
      candidatePhone: userInfo.telephone,
      questionIds,
      answers: formattedAnswers
    });

    if (supabaseResult.success) {
      // Construire le résultat avec les données de Supabase
      const result: QuizResult = {
        score: supabaseResult.score || 0,
        totalQuestions: supabaseResult.total || questions.length,
        correctAnswers: supabaseResult.correctCount || 0,
        wrongAnswers: supabaseResult.wrongCount || 0,
        unansweredQuestions: supabaseResult.unansweredCount || 0,
        concours: selectedConcours.name,
        userName: `${userInfo.prenom} ${userInfo.nom}`,
        userPhone: userInfo.telephone,
        submittedAt: new Date(),
        duration: Math.floor((Date.now() - quizStartTime!) / 1000),
        answers: answers.map(a => ({
          ...a,
          correctOptions: supabaseResult.correction?.find(c => c.id === a.questionId)?.correct_answers || [],
          isCorrect: supabaseResult.correction?.find(c => c.id === a.questionId)?.is_correct || false
        })),
        questions: supabaseResult.correction?.map(c => ({
          id: c.id,
          question: c.question_text,
          options: c.options,
          correctAnswers: c.correct_answers,
          category: c.category_id as Category
        })) || [],
        isCustomExam: true,
        submissionId: supabaseResult.submissionId
      };

      setQuizResult(result);
      setStep('result');
      return;
    }
  }

  // Fallback : calcul local si Supabase échoue ou n'est pas configuré
  // ... code existant de calcul local ...
}
```

---

## Architecture Finale

```
┌─────────────────────────────────────────────────────────────┐
│                    CONCOURS OFFICIELS                        │
├─────────────────────────────────────────────────────────────┤
│  1. Questions chargées depuis questions_public              │
│     (SANS correct_answers)                                  │
│                                                              │
│  2. Soumission via submit_quiz RPC                          │
│     → Supabase calcule le score                             │
│     → Retourne submissionId + score                         │
│                                                              │
│  3. Email envoyé avec lien de correction                    │
│                                                              │
│  4. Admin consulte via get_correction RPC                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    EXAMENS PERSONNALISÉS                     │
├─────────────────────────────────────────────────────────────┤
│  1. Questions chargées depuis questions_public              │
│     (SANS correct_answers)                                  │
│                                                              │
│  2. Soumission via submit_custom_exam RPC                   │
│     → Envoie les IDs des questions + réponses               │
│     → Supabase calcule le score                             │
│     → Retourne score + correction complète                  │
│                                                              │
│  3. Résultat affiché IMMÉDIATEMENT                          │
│     (pas d'email, candidat voit sa correction)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Flux de Données

```
                    FRONTEND                          SUPABASE
                    ────────                          ────────

 ┌──────────────────────┐
 │ CustomExamGenerator  │
 │ • Charge questions   │──────────► SELECT * FROM questions_public
 │   depuis Supabase    │◄────────── (sans correct_answers)
 └──────────┬───────────┘
            │
            │ Utilisateur répond
            ▼
 ┌──────────────────────┐
 │ Soumission           │
 │ • question_ids: []   │──────────► submit_custom_exam(...)
 │ • answers: [...]     │◄────────── {
 └──────────┬───────────┘              score: 35,
            │                          correction: [...],
            │                          correct_answers inclus !
            ▼                        }
 ┌──────────────────────┐
 │ Affichage résultat   │
 │ • Score: 35/50       │
 │ • Correction colorée │
 └──────────────────────┘
```

---

## Résumé

| Problème | Solution |
|----------|----------|
| `localConcoursData` désynchronisé | Tout passe par Supabase |
| `correct_answers` exposé | Jamais envoyé au frontend |
| Calcul local non fiable | Calcul côté serveur |
| Deux sources de données | Une seule : Supabase |

### Avantages

✅ **Sécurité** : Les bonnes réponses ne quittent jamais le serveur  
✅ **Cohérence** : Une seule source de vérité (Supabase)  
✅ **Maintenabilité** : Pas besoin de synchroniser `questions.ts`  
✅ **Fiabilité** : Calcul du score toujours correct  

### Ce qu'il faut faire

1. **Exécuter le script SQL** ci-dessus dans Supabase
2. **Ajouter la fonction** `submitCustomExam` dans `quizService.ts`
3. **Modifier** `App.tsx` pour utiliser cette fonction
4. **Tester** un examen personnalisé

Après ces modifications, les examens personnalisés fonctionneront parfaitement même en production, avec toutes les données venant de Supabase !
