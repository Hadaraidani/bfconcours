# Récapitulatif Final - Système de Correction

## Problème identifié

Le score se calcule correctement sur Supabase mais la page de correction affiche 0 bonnes réponses car :
1. Les données de `correction_data` n'étaient pas toujours correctement formatées
2. Le service ne normalisait pas correctement tous les formats de données

## Corrections apportées

### 1. Service `quizService.ts` amélioré

- Ajout de logs détaillés pour le debugging
- Fonction `normalizeQuestion()` qui gère tous les formats possibles :
  - `user_answers` ou `selectedOptions`
  - `correct_answers` ou `correctAnswers`
  - `question_id` ou `id`
  - `question_text` ou `question`
  - etc.

### 2. Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/services/quizService.ts` | Normalisation des données améliorée |
| `src/components/ResultPage.tsx` | Ajout de `correct_count`, `wrong_count`, `unanswered_count` dans l'email |
| `docs/GUIDE_FINAL_CORRECTION.md` | Nouveau guide avec script SQL corrigé |

---

## Ce que vous devez faire

### Étape 1 : Mettre à jour les fonctions SQL

Allez dans **Supabase → SQL Editor** et exécutez ce script :

```sql
-- Supprimer les anciennes fonctions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT oid::regprocedure AS func_signature
        FROM pg_proc 
        WHERE proname IN ('submit_quiz', 'get_correction')
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_signature || ' CASCADE';
    END LOOP;
END $$;

-- Recréer submit_quiz
CREATE OR REPLACE FUNCTION submit_quiz(
    p_concours_id TEXT,
    p_candidate_name TEXT,
    p_candidate_phone TEXT DEFAULT NULL,
    p_candidate_email TEXT DEFAULT NULL,
    p_answers JSONB DEFAULT '[]',
    p_duration_seconds INTEGER DEFAULT NULL,
    p_is_custom_exam BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_submission_id UUID;
    v_score INTEGER := 0;
    v_correct_count INTEGER := 0;
    v_wrong_count INTEGER := 0;
    v_unanswered_count INTEGER := 0;
    v_total_questions INTEGER;
    v_percentage DECIMAL(5,2);
    v_correction JSONB := '[]'::JSONB;
    v_question RECORD;
    v_answer JSONB;
    v_user_answers INTEGER[];
    v_is_correct BOOLEAN;
    v_points INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_questions
    FROM questions WHERE concours_id = p_concours_id;
    
    IF v_total_questions = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Aucune question trouvée pour ce concours'
        );
    END IF;
    
    FOR v_question IN 
        SELECT id, question_text, options, correct_answers, category_id, has_latex, image_url
        FROM questions WHERE concours_id = p_concours_id
        ORDER BY display_order, id
    LOOP
        v_user_answers := ARRAY[]::INTEGER[];
        
        FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
        LOOP
            IF (v_answer->>'question_id')::INTEGER = v_question.id THEN
                IF jsonb_typeof(v_answer->'selected_options') = 'array' THEN
                    SELECT COALESCE(ARRAY_AGG(val::INTEGER), ARRAY[]::INTEGER[])
                    INTO v_user_answers
                    FROM jsonb_array_elements_text(v_answer->'selected_options') AS val;
                END IF;
                EXIT;
            END IF;
        END LOOP;
        
        IF v_user_answers IS NULL THEN
            v_user_answers := ARRAY[]::INTEGER[];
        END IF;
        
        IF array_length(v_user_answers, 1) IS NULL OR array_length(v_user_answers, 1) = 0 THEN
            v_is_correct := false;
            v_points := 0;
            v_unanswered_count := v_unanswered_count + 1;
        ELSIF v_user_answers @> v_question.correct_answers 
              AND v_question.correct_answers @> v_user_answers THEN
            v_is_correct := true;
            v_points := 1;
            v_correct_count := v_correct_count + 1;
            v_score := v_score + 1;
        ELSE
            v_is_correct := false;
            v_points := -1;
            v_wrong_count := v_wrong_count + 1;
            v_score := v_score - 1;
        END IF;
        
        v_correction := v_correction || jsonb_build_object(
            'question_id', v_question.id,
            'question_text', v_question.question_text,
            'category_id', v_question.category_id,
            'options', v_question.options,
            'correct_answers', v_question.correct_answers,
            'user_answers', v_user_answers,
            'is_correct', v_is_correct,
            'points', v_points,
            'has_latex', COALESCE(v_question.has_latex, false),
            'image_url', v_question.image_url
        );
    END LOOP;
    
    v_percentage := ROUND((v_correct_count::DECIMAL / v_total_questions) * 100, 2);
    v_submission_id := gen_random_uuid();
    
    INSERT INTO quiz_submissions (
        id, concours_id, candidate_name, candidate_phone, candidate_email,
        answers, score, total_questions, correct_count, wrong_count,
        unanswered_count, percentage, correction_data, duration_seconds, is_custom_exam
    ) VALUES (
        v_submission_id, p_concours_id, p_candidate_name, p_candidate_phone, p_candidate_email,
        p_answers, v_score, v_total_questions, v_correct_count, v_wrong_count,
        v_unanswered_count, v_percentage, jsonb_build_object('questions', v_correction),
        p_duration_seconds, p_is_custom_exam
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'submission_id', v_submission_id,
        'score', v_score,
        'total_questions', v_total_questions,
        'correct_count', v_correct_count,
        'wrong_count', v_wrong_count,
        'unanswered_count', v_unanswered_count,
        'percentage', v_percentage
    );
END;
$$;

-- Recréer get_correction
CREATE OR REPLACE FUNCTION get_correction(p_submission_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_submission RECORD;
    v_concours_name TEXT;
    v_questions JSONB;
BEGIN
    SELECT * INTO v_submission FROM quiz_submissions WHERE id = p_submission_id;
    
    IF v_submission IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Soumission introuvable');
    END IF;
    
    SELECT name INTO v_concours_name FROM concours WHERE id = v_submission.concours_id;
    
    IF v_submission.correction_data IS NOT NULL AND v_submission.correction_data ? 'questions' THEN
        v_questions := v_submission.correction_data->'questions';
    ELSE
        v_questions := '[]'::JSONB;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'submission_id', v_submission.id,
        'candidate_name', v_submission.candidate_name,
        'candidate_phone', v_submission.candidate_phone,
        'candidate_email', v_submission.candidate_email,
        'concours_id', v_submission.concours_id,
        'concours_name', COALESCE(v_concours_name, v_submission.concours_id),
        'score', v_submission.score,
        'total_questions', v_submission.total_questions,
        'correct_count', v_submission.correct_count,
        'wrong_count', v_submission.wrong_count,
        'unanswered_count', v_submission.unanswered_count,
        'percentage', v_submission.percentage,
        'questions', v_questions,
        'created_at', v_submission.created_at,
        'is_custom_exam', v_submission.is_custom_exam
    );
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION submit_quiz TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_correction TO anon, authenticated;

SELECT 'Fonctions mises à jour!' AS status;
```

### Étape 2 : Vérifier le template EmailJS

Assurez-vous que votre template EmailJS contient ces variables :

| Variable | Description |
|----------|-------------|
| `{{candidate_name}}` | Nom du candidat |
| `{{candidate_phone}}` | Téléphone |
| `{{concours_name}}` | Nom du concours |
| `{{score}}` | Score obtenu |
| `{{total_questions}}` | Total questions |
| `{{correct_count}}` | Bonnes réponses |
| `{{wrong_count}}` | Mauvaises réponses |
| `{{unanswered_count}}` | Sans réponse |
| `{{submission_date}}` | Date |
| `{{correction_url}}` | Lien vers la correction |

### Étape 3 : Tester

1. Passez un QCM complet
2. Vérifiez dans la console du navigateur les logs :
   - `📤 Soumission du quiz à Supabase...`
   - `📥 Résultat submit_quiz: {...}`
   - `✅ Score calculé par Supabase: X / Y`
3. Cliquez sur le lien de correction
4. Vérifiez :
   - Le score affiché correspond à Supabase
   - Les bonnes réponses sont en vert
   - Les mauvaises réponses sont en rouge

---

## Dépannage

### Page de correction vide

1. Vérifiez que `correction_data` existe :
```sql
SELECT id, correction_data IS NOT NULL as has_correction
FROM quiz_submissions ORDER BY created_at DESC LIMIT 1;
```

2. Vérifiez le contenu :
```sql
SELECT correction_data->'questions'->0 
FROM quiz_submissions ORDER BY created_at DESC LIMIT 1;
```

### Score toujours à 0

Vérifiez que les IDs des questions correspondent :
```sql
-- IDs dans questions
SELECT id FROM questions WHERE concours_id = 'enam' ORDER BY id LIMIT 5;

-- IDs dans les réponses envoyées
SELECT answers->0->'question_id' FROM quiz_submissions ORDER BY created_at DESC LIMIT 1;
```

### Statistiques incorrectes

Vérifiez les valeurs dans quiz_submissions :
```sql
SELECT score, correct_count, wrong_count, unanswered_count 
FROM quiz_submissions ORDER BY created_at DESC LIMIT 1;
```
