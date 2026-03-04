# Script SQL Complet - Supabase

## Instructions

1. Allez dans **Supabase → SQL Editor**
2. Copiez **TOUT** le script ci-dessous
3. Cliquez **Run**
4. Vérifiez qu'il n'y a pas d'erreur

---

## Script SQL à exécuter

```sql
-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║                    SCRIPT SQL COMPLET - QCM CONCOURS BF                    ║
-- ║                          Version corrigée finale                           ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ══════════════════════════════════════════════════════════════════════════════
-- ÉTAPE 1 : NETTOYAGE COMPLET
-- ══════════════════════════════════════════════════════════════════════════════

-- Supprimer les fonctions existantes (toutes les versions)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT oid::regprocedure AS func_sig FROM pg_proc WHERE proname = 'submit_quiz' LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
    END LOOP;
    FOR r IN SELECT oid::regprocedure AS func_sig FROM pg_proc WHERE proname = 'get_correction' LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
    END LOOP;
END $$;

-- Supprimer la vue
DROP VIEW IF EXISTS questions_public CASCADE;

-- Supprimer les tables (ordre important pour les foreign keys)
DROP TABLE IF EXISTS quiz_submissions CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS concours_categories CASCADE;
DROP TABLE IF EXISTS concours CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ══════════════════════════════════════════════════════════════════════════════
-- ÉTAPE 2 : CRÉATION DES TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- Table des catégories (matières)
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_short TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des concours
CREATE TABLE concours (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    duration INTEGER DEFAULT 90,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des soumissions de quiz
CREATE TABLE quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_name TEXT NOT NULL,
    candidate_phone TEXT,
    concours_id TEXT REFERENCES concours(id),
    concours_name TEXT,
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    unanswered_count INTEGER DEFAULT 0,
    answers JSONB,
    correction_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- ÉTAPE 3 : INDEX POUR LES PERFORMANCES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_questions_concours ON questions(concours_id);
CREATE INDEX idx_questions_category ON questions(category_id);
CREATE INDEX idx_concours_categories_concours ON concours_categories(concours_id);
CREATE INDEX idx_quiz_submissions_created ON quiz_submissions(created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- ÉTAPE 4 : VUE PUBLIQUE (SANS correct_answers)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW questions_public AS
SELECT 
    id,
    concours_id,
    category_id,
    question_text,
    options,
    has_latex,
    image_url
FROM questions;

-- ══════════════════════════════════════════════════════════════════════════════
-- ÉTAPE 5 : ACTIVER RLS
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE concours ENABLE ROW LEVEL SECURITY;
ALTER TABLE concours_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════════════════════
-- ÉTAPE 6 : POLITIQUES RLS - LECTURE PUBLIQUE
-- ══════════════════════════════════════════════════════════════════════════════

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "categories_read" ON categories;
DROP POLICY IF EXISTS "concours_read" ON concours;
DROP POLICY IF EXISTS "concours_categories_read" ON concours_categories;
DROP POLICY IF EXISTS "questions_read" ON questions;
DROP POLICY IF EXISTS "quiz_submissions_insert" ON quiz_submissions;
DROP POLICY IF EXISTS "quiz_submissions_read" ON quiz_submissions;

-- Politiques de lecture pour tous
CREATE POLICY "categories_read" ON categories FOR SELECT USING (true);
CREATE POLICY "concours_read" ON concours FOR SELECT USING (true);
CREATE POLICY "concours_categories_read" ON concours_categories FOR SELECT USING (true);
CREATE POLICY "questions_read" ON questions FOR SELECT USING (true);

-- Politiques pour quiz_submissions
CREATE POLICY "quiz_submissions_insert" ON quiz_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "quiz_submissions_read" ON quiz_submissions FOR SELECT USING (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- ÉTAPE 7 : FONCTION submit_quiz (calcul du score côté serveur)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION submit_quiz(
    p_candidate_name TEXT,
    p_candidate_phone TEXT,
    p_concours_id TEXT,
    p_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_submission_id UUID;
    v_question RECORD;
    v_answer JSONB;
    v_selected INTEGER[];
    v_correct INTEGER[];
    v_score INTEGER := 0;
    v_total INTEGER := 0;
    v_correct_count INTEGER := 0;
    v_wrong_count INTEGER := 0;
    v_unanswered_count INTEGER := 0;
    v_correction JSONB := '[]'::JSONB;
    v_concours_name TEXT;
    v_is_correct BOOLEAN;
    v_points INTEGER;
    v_question_correction JSONB;
BEGIN
    -- Récupérer le nom du concours
    SELECT name INTO v_concours_name FROM concours WHERE id = p_concours_id;
    
    IF v_concours_name IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Concours non trouvé: ' || p_concours_id
        );
    END IF;

    -- Générer l'ID de soumission
    v_submission_id := gen_random_uuid();

    -- Parcourir toutes les questions du concours
    FOR v_question IN 
        SELECT id, question_text, options, correct_answers, category_id, has_latex, image_url
        FROM questions 
        WHERE concours_id = p_concours_id
        ORDER BY id
    LOOP
        v_total := v_total + 1;
        v_correct := v_question.correct_answers;
        v_selected := ARRAY[]::INTEGER[];
        v_is_correct := false;
        v_points := 0;

        -- Chercher la réponse de l'utilisateur pour cette question
        SELECT elem INTO v_answer
        FROM jsonb_array_elements(p_answers) AS elem
        WHERE (elem->>'question_id')::INTEGER = v_question.id
        LIMIT 1;

        -- Extraire les options sélectionnées
        IF v_answer IS NOT NULL AND v_answer->'selected_options' IS NOT NULL THEN
            SELECT ARRAY(
                SELECT (jsonb_array_elements_text(v_answer->'selected_options'))::INTEGER
            ) INTO v_selected;
        END IF;

        -- Calculer le score
        IF v_selected IS NULL OR array_length(v_selected, 1) IS NULL OR array_length(v_selected, 1) = 0 THEN
            -- Pas de réponse
            v_unanswered_count := v_unanswered_count + 1;
            v_points := 0;
        ELSE
            -- Vérifier si la réponse est correcte (toutes les bonnes réponses et rien de plus)
            IF v_selected @> v_correct AND v_correct @> v_selected THEN
                v_is_correct := true;
                v_correct_count := v_correct_count + 1;
                v_score := v_score + 1;
                v_points := 1;
            ELSE
                v_wrong_count := v_wrong_count + 1;
                v_score := v_score - 1;
                v_points := -1;
            END IF;
        END IF;

        -- Construire l'objet de correction pour cette question
        v_question_correction := jsonb_build_object(
            'id', v_question.id,
            'question_text', v_question.question_text,
            'options', v_question.options,
            'category_id', v_question.category_id,
            'has_latex', v_question.has_latex,
            'image_url', v_question.image_url,
            'correct_answers', v_correct,
            'user_answers', v_selected,
            'is_correct', v_is_correct,
            'points', v_points
        );

        -- Ajouter à la correction
        v_correction := v_correction || jsonb_build_array(v_question_correction);
    END LOOP;

    -- Insérer la soumission
    INSERT INTO quiz_submissions (
        id,
        candidate_name,
        candidate_phone,
        concours_id,
        concours_name,
        score,
        total_questions,
        correct_count,
        wrong_count,
        unanswered_count,
        answers,
        correction_data
    ) VALUES (
        v_submission_id,
        p_candidate_name,
        p_candidate_phone,
        p_concours_id,
        v_concours_name,
        v_score,
        v_total,
        v_correct_count,
        v_wrong_count,
        v_unanswered_count,
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
        'percentage', CASE WHEN v_total > 0 THEN ROUND((v_correct_count::NUMERIC / v_total) * 100) ELSE 0 END
    );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- ÉTAPE 8 : FONCTION get_correction (récupération de la correction)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_correction(p_submission_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_submission RECORD;
BEGIN
    -- Récupérer la soumission
    SELECT * INTO v_submission
    FROM quiz_submissions
    WHERE id = p_submission_id;

    IF v_submission IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Soumission non trouvée'
        );
    END IF;

    -- Retourner les données de correction
    RETURN jsonb_build_object(
        'success', true,
        'submission_id', v_submission.id,
        'candidate_name', v_submission.candidate_name,
        'candidate_phone', v_submission.candidate_phone,
        'concours_id', v_submission.concours_id,
        'concours_name', v_submission.concours_name,
        'score', v_submission.score,
        'total_questions', v_submission.total_questions,
        'correct_count', v_submission.correct_count,
        'wrong_count', v_submission.wrong_count,
        'unanswered_count', v_submission.unanswered_count,
        'created_at', v_submission.created_at,
        'questions', COALESCE(v_submission.correction_data->'questions', '[]'::JSONB)
    );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- ÉTAPE 9 : FONCTION submit_custom_exam (pour les examens personnalisés)
-- ══════════════════════════════════════════════════════════════════════════════

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
    v_submission_id UUID;
    v_question RECORD;
    v_answer JSONB;
    v_selected INTEGER[];
    v_correct INTEGER[];
    v_score INTEGER := 0;
    v_total INTEGER := 0;
    v_correct_count INTEGER := 0;
    v_wrong_count INTEGER := 0;
    v_unanswered_count INTEGER := 0;
    v_correction JSONB := '[]'::JSONB;
    v_is_correct BOOLEAN;
    v_points INTEGER;
    v_question_correction JSONB;
BEGIN
    -- Compter le nombre de questions
    v_total := array_length(p_question_ids, 1);
    
    IF v_total IS NULL OR v_total = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Aucune question fournie'
        );
    END IF;

    -- Générer l'ID de soumission
    v_submission_id := gen_random_uuid();

    -- Parcourir chaque question demandée
    FOR v_question IN 
        SELECT id, question_text, options, correct_answers, category_id, has_latex, image_url
        FROM questions 
        WHERE id = ANY(p_question_ids)
        ORDER BY id
    LOOP
        v_correct := v_question.correct_answers;
        v_selected := ARRAY[]::INTEGER[];
        v_is_correct := false;
        v_points := 0;

        -- Chercher la réponse de l'utilisateur pour cette question
        SELECT elem INTO v_answer
        FROM jsonb_array_elements(p_answers) AS elem
        WHERE (elem->>'question_id')::INTEGER = v_question.id
        LIMIT 1;

        -- Extraire les options sélectionnées
        IF v_answer IS NOT NULL AND v_answer->'selected_options' IS NOT NULL THEN
            SELECT ARRAY(
                SELECT (jsonb_array_elements_text(v_answer->'selected_options'))::INTEGER
            ) INTO v_selected;
        END IF;

        -- Calculer le score
        IF v_selected IS NULL OR array_length(v_selected, 1) IS NULL OR array_length(v_selected, 1) = 0 THEN
            -- Pas de réponse
            v_unanswered_count := v_unanswered_count + 1;
            v_points := 0;
        ELSE
            -- Vérifier si la réponse est correcte
            IF v_selected @> v_correct AND v_correct @> v_selected THEN
                v_is_correct := true;
                v_correct_count := v_correct_count + 1;
                v_score := v_score + 1;
                v_points := 1;
            ELSE
                v_wrong_count := v_wrong_count + 1;
                v_score := v_score - 1;
                v_points := -1;
            END IF;
        END IF;

        -- Construire l'objet de correction pour cette question
        v_question_correction := jsonb_build_object(
            'id', v_question.id,
            'question_text', v_question.question_text,
            'options', v_question.options,
            'category_id', v_question.category_id,
            'has_latex', v_question.has_latex,
            'image_url', v_question.image_url,
            'correct_answers', v_correct,
            'user_answers', v_selected,
            'is_correct', v_is_correct,
            'points', v_points
        );

        -- Ajouter à la correction
        v_correction := v_correction || jsonb_build_array(v_question_correction);
    END LOOP;

    -- Recalculer le total basé sur les questions trouvées
    v_total := v_correct_count + v_wrong_count + v_unanswered_count;

    -- Insérer la soumission
    INSERT INTO quiz_submissions (
        id,
        candidate_name,
        candidate_phone,
        concours_id,
        concours_name,
        score,
        total_questions,
        correct_count,
        wrong_count,
        unanswered_count,
        answers,
        correction_data
    ) VALUES (
        v_submission_id,
        p_candidate_name,
        p_candidate_phone,
        'custom-exam',
        'Examen Personnalisé',
        v_score,
        v_total,
        v_correct_count,
        v_wrong_count,
        v_unanswered_count,
        p_answers,
        jsonb_build_object('questions', v_correction)
    );

    -- Retourner le résultat avec la correction complète
    RETURN jsonb_build_object(
        'success', true,
        'submission_id', v_submission_id,
        'score', v_score,
        'total', v_total,
        'correct_count', v_correct_count,
        'wrong_count', v_wrong_count,
        'unanswered_count', v_unanswered_count,
        'percentage', CASE WHEN v_total > 0 THEN ROUND((v_correct_count::NUMERIC / v_total) * 100) ELSE 0 END,
        'correction', v_correction
    );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- ÉTAPE 10 : PERMISSIONS POUR LES FONCTIONS RPC
-- ══════════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION submit_quiz TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_correction TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_custom_exam TO anon, authenticated;

-- Permissions sur les tables (nécessaire pour les fonctions SECURITY DEFINER)
GRANT SELECT ON questions TO anon, authenticated;
GRANT SELECT ON concours TO anon, authenticated;
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT ON concours_categories TO anon, authenticated;
GRANT SELECT ON questions_public TO anon, authenticated;
GRANT INSERT, SELECT ON quiz_submissions TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- ÉTAPE 11 : TEST DE VÉRIFICATION
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '                    INSTALLATION TERMINÉE                        ';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Tables créées: categories, concours, concours_categories, questions, quiz_submissions';
    RAISE NOTICE 'Vue créée: questions_public (sans correct_answers)';
    RAISE NOTICE 'Fonctions créées: submit_quiz, get_correction, submit_custom_exam';
    RAISE NOTICE '';
    RAISE NOTICE 'Prochaine étape: Exécutez "npm run migrate" pour importer les questions';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;
```

---

## Vérification après exécution

Exécutez ces requêtes pour vérifier que tout est bien créé :

```sql
-- Vérifier les tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Vérifier la vue
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public';

-- Vérifier les fonctions
SELECT proname FROM pg_proc 
WHERE proname IN ('submit_quiz', 'get_correction', 'submit_custom_exam');

-- Vérifier les colonnes de questions_public (ne doit PAS avoir correct_answers)
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'questions_public';
```

---

## Résultat attendu

Après exécution du script :

| Élément | Nombre |
|---------|--------|
| Tables | 5 (categories, concours, concours_categories, questions, quiz_submissions) |
| Vue | 1 (questions_public) |
| Fonctions | 3 (submit_quiz, get_correction, submit_custom_exam) |
