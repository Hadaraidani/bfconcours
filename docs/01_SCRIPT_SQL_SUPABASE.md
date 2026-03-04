# Script SQL Complet - Supabase

## Instructions

1. Allez sur **Supabase → SQL Editor**
2. Créez une **New query**
3. Copiez **TOUT** le script ci-dessous
4. Cliquez **Run**
5. Vérifiez qu'il n'y a pas d'erreur

---

## Script SQL Complet

```sql
-- ═══════════════════════════════════════════════════════════════════
-- SCRIPT COMPLET - QCM CONCOURS BURKINA FASO
-- Version: 2.0 - Architecture sécurisée
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 1: NETTOYAGE COMPLET
-- ═══════════════════════════════════════════════════════════════════

-- Supprimer les fonctions existantes
DROP FUNCTION IF EXISTS submit_quiz(text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS submit_quiz(text, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS get_correction(uuid) CASCADE;

-- Supprimer les vues
DROP VIEW IF EXISTS questions_public CASCADE;

-- Supprimer les tables (dans l'ordre des dépendances)
DROP TABLE IF EXISTS quiz_submissions CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS concours_categories CASCADE;
DROP TABLE IF EXISTS concours CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 2: CRÉATION DES TABLES
-- ═══════════════════════════════════════════════════════════════════

-- Table des catégories (matières)
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_short TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des concours
CREATE TABLE concours (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    duration INTEGER DEFAULT 90,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table de liaison concours-catégories
CREATE TABLE concours_categories (
    id SERIAL PRIMARY KEY,
    concours_id TEXT NOT NULL REFERENCES concours(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    questions_count INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    UNIQUE(concours_id, category_id)
);

-- Table des questions
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    concours_id TEXT NOT NULL REFERENCES concours(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    correct_answers INTEGER[] NOT NULL DEFAULT '{}',
    has_latex BOOLEAN DEFAULT false,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des soumissions de quiz
CREATE TABLE quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concours_id TEXT REFERENCES concours(id),
    candidate_name TEXT,
    candidate_phone TEXT,
    candidate_email TEXT,
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    unanswered_count INTEGER DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    answers JSONB DEFAULT '[]',
    correction_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 3: INDEX POUR PERFORMANCES
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX idx_questions_concours ON questions(concours_id);
CREATE INDEX idx_questions_category ON questions(category_id);
CREATE INDEX idx_concours_categories_concours ON concours_categories(concours_id);
CREATE INDEX idx_quiz_submissions_concours ON quiz_submissions(concours_id);
CREATE INDEX idx_quiz_submissions_created ON quiz_submissions(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 4: VUE PUBLIQUE (SANS RÉPONSES CORRECTES)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW questions_public AS
SELECT 
    id,
    concours_id,
    category_id,
    question_text,
    options,
    has_latex,
    image_url,
    created_at
    -- ⚠️ correct_answers est EXCLU pour la sécurité
FROM questions;

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 5: FONCTION SUBMIT_QUIZ (CALCUL DU SCORE)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION submit_quiz(
    p_concours_id TEXT,
    p_candidate_name TEXT,
    p_candidate_phone TEXT,
    p_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_question RECORD;
    v_answer JSONB;
    v_user_answers INTEGER[];
    v_correct_answers INTEGER[];
    v_score INTEGER := 0;
    v_total INTEGER := 0;
    v_correct_count INTEGER := 0;
    v_wrong_count INTEGER := 0;
    v_unanswered_count INTEGER := 0;
    v_percentage DECIMAL(5,2) := 0;
    v_submission_id UUID;
    v_correction JSONB := '[]'::JSONB;
    v_question_result JSONB;
    v_is_correct BOOLEAN;
    v_points INTEGER;
BEGIN
    -- Générer un ID unique pour cette soumission
    v_submission_id := gen_random_uuid();
    
    -- Parcourir toutes les questions du concours
    FOR v_question IN 
        SELECT id, question_text, options, correct_answers, category_id, has_latex, image_url
        FROM questions 
        WHERE concours_id = p_concours_id
        ORDER BY id
    LOOP
        v_total := v_total + 1;
        v_user_answers := ARRAY[]::INTEGER[];
        v_is_correct := false;
        v_points := 0;
        
        -- Chercher la réponse de l'utilisateur pour cette question
        FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
        LOOP
            -- Vérifier si cette réponse correspond à la question actuelle
            IF (v_answer->>'question_id')::INTEGER = v_question.id THEN
                -- Extraire les réponses sélectionnées
                IF jsonb_typeof(v_answer->'selected_options') = 'array' THEN
                    SELECT ARRAY_AGG(val::INTEGER)
                    INTO v_user_answers
                    FROM jsonb_array_elements_text(v_answer->'selected_options') AS val;
                END IF;
                EXIT;
            END IF;
        END LOOP;
        
        -- Gérer le cas où v_user_answers est NULL
        IF v_user_answers IS NULL THEN
            v_user_answers := ARRAY[]::INTEGER[];
        END IF;
        
        -- Calculer le score pour cette question
        v_correct_answers := v_question.correct_answers;
        
        IF array_length(v_user_answers, 1) IS NULL OR array_length(v_user_answers, 1) = 0 THEN
            -- Pas de réponse = 0 point
            v_unanswered_count := v_unanswered_count + 1;
            v_points := 0;
        ELSIF v_user_answers @> v_correct_answers AND v_correct_answers @> v_user_answers THEN
            -- Toutes les bonnes réponses et uniquement les bonnes réponses = +1 point
            v_correct_count := v_correct_count + 1;
            v_is_correct := true;
            v_points := 1;
            v_score := v_score + 1;
        ELSE
            -- Mauvaise réponse = -1 point
            v_wrong_count := v_wrong_count + 1;
            v_points := -1;
            v_score := v_score - 1;
        END IF;
        
        -- Construire les données de correction pour cette question
        v_question_result := jsonb_build_object(
            'id', v_question.id,
            'question_text', v_question.question_text,
            'options', v_question.options,
            'category_id', v_question.category_id,
            'has_latex', v_question.has_latex,
            'image_url', v_question.image_url,
            'correct_answers', v_question.correct_answers,
            'user_answers', v_user_answers,
            'is_correct', v_is_correct,
            'points', v_points
        );
        
        v_correction := v_correction || v_question_result;
    END LOOP;
    
    -- Calculer le pourcentage (basé sur le score maximum possible)
    IF v_total > 0 THEN
        v_percentage := ROUND((v_score::DECIMAL / v_total) * 100, 2);
    END IF;
    
    -- Insérer la soumission dans la base
    INSERT INTO quiz_submissions (
        id,
        concours_id,
        candidate_name,
        candidate_phone,
        score,
        total_questions,
        correct_count,
        wrong_count,
        unanswered_count,
        percentage,
        answers,
        correction_data
    ) VALUES (
        v_submission_id,
        p_concours_id,
        p_candidate_name,
        p_candidate_phone,
        v_score,
        v_total,
        v_correct_count,
        v_wrong_count,
        v_unanswered_count,
        v_percentage,
        p_answers,
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
        'percentage', v_percentage
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 6: FONCTION GET_CORRECTION (RÉCUPÉRER LA CORRECTION)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_correction(p_submission_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_submission RECORD;
    v_concours_name TEXT;
BEGIN
    -- Récupérer la soumission
    SELECT * INTO v_submission
    FROM quiz_submissions
    WHERE id = p_submission_id;
    
    -- Vérifier si la soumission existe
    IF v_submission IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Soumission non trouvée'
        );
    END IF;
    
    -- Récupérer le nom du concours
    SELECT name INTO v_concours_name
    FROM concours
    WHERE id = v_submission.concours_id;
    
    -- Retourner les données complètes
    RETURN jsonb_build_object(
        'success', true,
        'submission_id', v_submission.id,
        'candidate_name', v_submission.candidate_name,
        'candidate_phone', v_submission.candidate_phone,
        'concours_id', v_submission.concours_id,
        'concours_name', COALESCE(v_concours_name, 'Concours'),
        'score', v_submission.score,
        'total', v_submission.total_questions,
        'correct_count', v_submission.correct_count,
        'wrong_count', v_submission.wrong_count,
        'unanswered_count', v_submission.unanswered_count,
        'percentage', v_submission.percentage,
        'questions', v_submission.correction_data->'questions',
        'created_at', v_submission.created_at
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 7: POLITIQUES DE SÉCURITÉ (RLS)
-- ═══════════════════════════════════════════════════════════════════

-- Activer RLS sur toutes les tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE concours ENABLE ROW LEVEL SECURITY;
ALTER TABLE concours_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture pour les tables publiques
CREATE POLICY "Lecture publique categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Lecture publique concours" ON concours FOR SELECT USING (true);
CREATE POLICY "Lecture publique concours_categories" ON concours_categories FOR SELECT USING (true);

-- IMPORTANT: La table questions n'est PAS accessible directement
-- On utilise la vue questions_public à la place
CREATE POLICY "Pas de lecture directe questions" ON questions FOR SELECT USING (false);

-- Politique pour les soumissions (lecture via la fonction RPC uniquement)
CREATE POLICY "Lecture soumissions via RPC" ON quiz_submissions FOR SELECT USING (false);
CREATE POLICY "Insertion soumissions via RPC" ON quiz_submissions FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 8: PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════

-- Accorder les permissions sur la vue publique
GRANT SELECT ON questions_public TO anon, authenticated;

-- Accorder les permissions sur les tables publiques
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT ON concours TO anon, authenticated;
GRANT SELECT ON concours_categories TO anon, authenticated;

-- Accorder les permissions d'exécution sur les fonctions RPC
GRANT EXECUTE ON FUNCTION submit_quiz(TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_correction(UUID) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- VÉRIFICATION FINALE
-- ═══════════════════════════════════════════════════════════════════

-- Vérifier que les tables existent
SELECT 'Tables créées:' AS status, COUNT(*) AS count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('categories', 'concours', 'concours_categories', 'questions', 'quiz_submissions');

-- Vérifier que les fonctions existent
SELECT 'Fonctions créées:' AS status, COUNT(*) AS count 
FROM pg_proc 
WHERE proname IN ('submit_quiz', 'get_correction');

-- Vérifier que la vue existe
SELECT 'Vue créée:' AS status, COUNT(*) AS count 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'questions_public';
```

---

## Après l'exécution

Vous devriez voir :

```
status              | count
--------------------|------
Tables créées:      | 5
Fonctions créées:   | 2
Vue créée:          | 1
```

---

## Étape suivante

Après avoir exécuté ce script, lancez la migration des questions :

```bash
npm run migrate
```

Cela importera les questions depuis `src/data/questions-migration.ts` vers Supabase.
