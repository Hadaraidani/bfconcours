# Guide Final : Système de Correction Fonctionnel

## Problème identifié

Le score se calcule correctement sur Supabase mais la page de correction affiche toujours 0 bonnes réponses car :

1. Les IDs des questions envoyées par le frontend ne correspondent pas toujours aux IDs dans Supabase
2. La fonction `get_correction` peut retourner un format différent de celui attendu par le frontend
3. Le template EmailJS peut ne pas utiliser les bonnes variables

---

## Solution : Script SQL Corrigé

Exécutez ce script dans **Supabase → SQL Editor** :

```sql
-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║     SYSTÈME DE CORRECTION - VERSION FINALE CORRIGÉE              ║
-- ╚═══════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 1 : SUPPRIMER LES ANCIENNES FONCTIONS
-- ═══════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 2 : FONCTION submit_quiz CORRIGÉE
-- ═══════════════════════════════════════════════════════════════════

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
    v_found BOOLEAN;
BEGIN
    -- Compter le total des questions pour ce concours
    SELECT COUNT(*) INTO v_total_questions
    FROM questions
    WHERE concours_id = p_concours_id;
    
    IF v_total_questions = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Aucune question trouvée pour ce concours: ' || p_concours_id
        );
    END IF;
    
    -- Log pour debug
    RAISE NOTICE 'Total questions pour %: %', p_concours_id, v_total_questions;
    RAISE NOTICE 'Réponses reçues: %', p_answers;
    
    -- Parcourir chaque question du concours
    FOR v_question IN 
        SELECT id, question_text, options, correct_answers, category_id, has_latex, image_url
        FROM questions 
        WHERE concours_id = p_concours_id
        ORDER BY display_order, id
    LOOP
        -- Chercher la réponse de l'utilisateur pour cette question
        v_user_answers := ARRAY[]::INTEGER[];
        v_found := false;
        
        FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
        LOOP
            -- Vérifier avec question_id
            IF (v_answer->>'question_id')::INTEGER = v_question.id THEN
                v_found := true;
                -- Convertir selected_options en tableau d'entiers
                IF jsonb_typeof(v_answer->'selected_options') = 'array' THEN
                    SELECT COALESCE(ARRAY_AGG(val::INTEGER), ARRAY[]::INTEGER[])
                    INTO v_user_answers
                    FROM jsonb_array_elements_text(v_answer->'selected_options') AS val;
                END IF;
                EXIT;
            END IF;
        END LOOP;
        
        -- Si pas de réponse trouvée, tableau vide
        IF v_user_answers IS NULL THEN
            v_user_answers := ARRAY[]::INTEGER[];
        END IF;
        
        -- Calculer le score pour cette question
        IF array_length(v_user_answers, 1) IS NULL OR array_length(v_user_answers, 1) = 0 THEN
            -- Pas de réponse = 0 point
            v_is_correct := false;
            v_points := 0;
            v_unanswered_count := v_unanswered_count + 1;
        ELSIF v_user_answers @> v_question.correct_answers 
              AND v_question.correct_answers @> v_user_answers THEN
            -- Réponse parfaitement correcte = +1 point
            v_is_correct := true;
            v_points := 1;
            v_correct_count := v_correct_count + 1;
            v_score := v_score + 1;
        ELSE
            -- Réponse incorrecte ou partielle = -1 point
            v_is_correct := false;
            v_points := -1;
            v_wrong_count := v_wrong_count + 1;
            v_score := v_score - 1;
        END IF;
        
        -- Ajouter à la correction avec TOUS les détails
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
    
    -- Calculer le pourcentage (basé sur les bonnes réponses)
    v_percentage := ROUND((v_correct_count::DECIMAL / v_total_questions) * 100, 2);
    
    -- Générer l'ID de soumission
    v_submission_id := gen_random_uuid();
    
    -- Insérer la soumission avec correction_data
    INSERT INTO quiz_submissions (
        id,
        concours_id,
        candidate_name,
        candidate_phone,
        candidate_email,
        answers,
        score,
        total_questions,
        correct_count,
        wrong_count,
        unanswered_count,
        percentage,
        correction_data,
        duration_seconds,
        is_custom_exam
    ) VALUES (
        v_submission_id,
        p_concours_id,
        p_candidate_name,
        p_candidate_phone,
        p_candidate_email,
        p_answers,
        v_score,
        v_total_questions,
        v_correct_count,
        v_wrong_count,
        v_unanswered_count,
        v_percentage,
        jsonb_build_object('questions', v_correction),
        p_duration_seconds,
        p_is_custom_exam
    );
    
    -- Retourner le résultat
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

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 3 : FONCTION get_correction CORRIGÉE
-- ═══════════════════════════════════════════════════════════════════

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
    -- Récupérer la soumission
    SELECT * INTO v_submission
    FROM quiz_submissions
    WHERE id = p_submission_id;
    
    IF v_submission IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Soumission introuvable'
        );
    END IF;
    
    -- Récupérer le nom du concours
    SELECT name INTO v_concours_name
    FROM concours
    WHERE id = v_submission.concours_id;
    
    -- Extraire les questions de correction_data
    IF v_submission.correction_data IS NOT NULL AND v_submission.correction_data ? 'questions' THEN
        v_questions := v_submission.correction_data->'questions';
    ELSE
        v_questions := '[]'::JSONB;
    END IF;
    
    -- Retourner la correction complète
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

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 4 : DONNER LES PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION submit_quiz TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_correction TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- VÉRIFICATION
-- ═══════════════════════════════════════════════════════════════════

SELECT 'Fonctions créées avec succès!' AS status;

-- Vérifier les fonctions
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname IN ('submit_quiz', 'get_correction');
```

---

## Template EmailJS

Assurez-vous que votre template EmailJS utilise ces variables :

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Résultat QCM</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">QCM Concours Burkina Faso</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Nouvelle soumission de QCM</p>
    </div>
    
    <!-- Contenu -->
    <div style="padding: 30px;">
      
      <!-- Informations candidat -->
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #334155; margin: 0 0 15px 0; font-size: 18px;">Informations du candidat</h2>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Nom complet</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: bold; text-align: right;">{{candidate_name}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Téléphone</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: bold; text-align: right;">{{candidate_phone}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Concours</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: bold; text-align: right;">{{concours_name}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Date</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: bold; text-align: right;">{{submission_date}}</td>
          </tr>
        </table>
      </div>
      
      <!-- Score -->
      <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 8px; margin-bottom: 20px;">
        <p style="color: #166534; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Score obtenu</p>
        <p style="color: #166534; margin: 0; font-size: 48px; font-weight: bold;">{{score}} / {{total_questions}}</p>
        <p style="color: #166534; margin: 10px 0 0 0; font-size: 14px;">
          ✅ {{correct_count}} correcte(s) | ❌ {{wrong_count}} incorrecte(s) | ⬜ {{unanswered_count}} sans réponse
        </p>
      </div>
      
      <!-- Bouton correction -->
      <div style="text-align: center;">
        <a href="{{correction_url}}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Voir la correction détaillée
        </a>
      </div>
      
    </div>
    
    <!-- Footer -->
    <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; margin: 0; font-size: 12px;">
        Ce message a été envoyé automatiquement par la plateforme QCM Concours BF
      </p>
    </div>
    
  </div>
</body>
</html>
```

### Variables à configurer dans EmailJS

| Variable | Description |
|----------|-------------|
| `{{candidate_name}}` | Nom du candidat |
| `{{candidate_phone}}` | Téléphone |
| `{{concours_name}}` | Nom du concours |
| `{{submission_date}}` | Date de soumission |
| `{{score}}` | Score obtenu |
| `{{total_questions}}` | Nombre total de questions |
| `{{correct_count}}` | Nombre de bonnes réponses |
| `{{wrong_count}}` | Nombre de mauvaises réponses |
| `{{unanswered_count}}` | Sans réponse |
| `{{correction_url}}` | Lien vers la correction |

---

## Vérification du flux

### 1. Vérifier les questions dans Supabase

```sql
-- Vérifier les questions d'un concours
SELECT id, question_text, correct_answers 
FROM questions 
WHERE concours_id = 'enam' 
LIMIT 5;
```

### 2. Vérifier une soumission récente

```sql
-- Dernière soumission
SELECT 
  id, 
  candidate_name, 
  score, 
  correct_count, 
  wrong_count,
  jsonb_array_length(correction_data->'questions') as nb_questions_correction
FROM quiz_submissions 
ORDER BY created_at DESC 
LIMIT 1;
```

### 3. Tester la fonction get_correction

```sql
-- Remplacer UUID par un vrai ID de soumission
SELECT get_correction('votre-uuid-ici'::UUID);
```

---

## Dépannage

### Score toujours à 0

1. Vérifier que les IDs des questions correspondent :
```sql
SELECT DISTINCT id FROM questions WHERE concours_id = 'enam';
```

2. Vérifier le format des réponses envoyées (dans la console du navigateur) :
```javascript
// Doit être ce format :
[
  { question_id: 1, selected_options: [0] },
  { question_id: 2, selected_options: [1, 2] }
]
```

### Page de correction vide

1. Vérifier que `correction_data` n'est pas null :
```sql
SELECT correction_data IS NOT NULL as has_correction
FROM quiz_submissions 
ORDER BY created_at DESC 
LIMIT 1;
```

2. Vérifier le contenu de `correction_data` :
```sql
SELECT correction_data->'questions'->0
FROM quiz_submissions 
ORDER BY created_at DESC 
LIMIT 1;
```
