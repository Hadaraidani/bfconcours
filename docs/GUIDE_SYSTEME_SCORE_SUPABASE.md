# Guide Complet : Système de Score Sécurisé avec Supabase

## Table des matières

1. [Architecture](#architecture)
2. [Script SQL à exécuter](#script-sql-à-exécuter)
3. [Service Frontend](#service-frontend)
4. [Flux de fonctionnement](#flux-de-fonctionnement)
5. [Sécurité](#sécurité)
6. [Dépannage](#dépannage)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE SÉCURISÉE                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FRONTEND (React)                                           │
│  ───────────────                                            │
│  • Charge les questions via VUE questions_public            │
│  • ⚠️ JAMAIS accès à correct_answers                        │
│  • Envoie les réponses via RPC submit_quiz                  │
│  • Reçoit uniquement: score, total, percentage              │
│                                                              │
│                         │                                    │
│                         ▼                                    │
│                                                              │
│  SUPABASE (Backend sécurisé)                                │
│  ───────────────────────────                                │
│  • Table questions avec correct_answers (PRIVÉ)             │
│  • Vue questions_public SANS correct_answers                │
│  • Fonction submit_quiz calcule le score côté serveur       │
│  • Fonction get_correction retourne la correction           │
│  • Table quiz_submissions stocke les résultats              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Principes de sécurité

| Règle | Description |
|-------|-------------|
| **correct_answers JAMAIS exposé** | La vue publique exclut ce champ |
| **Calcul côté serveur** | La fonction RPC compare les réponses |
| **SECURITY DEFINER** | Les fonctions s'exécutent avec privilèges élevés |
| **UUID pour les soumissions** | Impossible de deviner les IDs |

---

## Script SQL à exécuter

Copiez **TOUT** ce script et exécutez-le dans **Supabase → SQL Editor** :

```sql
-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║     SYSTÈME DE SCORE SÉCURISÉ - SCRIPT COMPLET                    ║
-- ║     À exécuter dans Supabase SQL Editor                           ║
-- ╚═══════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 1 : SUPPRESSION DES ANCIENNES FONCTIONS ET TABLES
-- ═══════════════════════════════════════════════════════════════════

-- Supprimer les fonctions existantes
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

-- Supprimer les vues et tables
DROP VIEW IF EXISTS questions_public CASCADE;
DROP TABLE IF EXISTS quiz_submissions CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS concours_categories CASCADE;
DROP TABLE IF EXISTS concours CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 2 : CRÉATION DES TABLES
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

-- Table des questions (avec correct_answers PRIVÉ)
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    concours_id TEXT NOT NULL REFERENCES concours(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    correct_answers INTEGER[] NOT NULL DEFAULT '{}',
    has_latex BOOLEAN DEFAULT false,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des soumissions de quiz
CREATE TABLE quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concours_id TEXT NOT NULL REFERENCES concours(id),
    candidate_name TEXT NOT NULL,
    candidate_phone TEXT,
    candidate_email TEXT,
    answers JSONB NOT NULL DEFAULT '[]',
    score INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    unanswered_count INTEGER NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    correction_data JSONB,
    duration_seconds INTEGER,
    is_custom_exam BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 3 : CRÉATION DES INDEX
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX idx_questions_concours ON questions(concours_id);
CREATE INDEX idx_questions_category ON questions(category_id);
CREATE INDEX idx_concours_categories_concours ON concours_categories(concours_id);
CREATE INDEX idx_quiz_submissions_concours ON quiz_submissions(concours_id);
CREATE INDEX idx_quiz_submissions_created ON quiz_submissions(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 4 : VUE PUBLIQUE (SANS correct_answers)
-- ═══════════════════════════════════════════════════════════════════

CREATE VIEW questions_public AS
SELECT 
    id,
    concours_id,
    category_id,
    question_text,
    options,
    has_latex,
    image_url,
    display_order
    -- ⚠️ correct_answers est EXCLU de cette vue
FROM questions;

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 5 : FONCTION submit_quiz (CALCUL DU SCORE CÔTÉ SERVEUR)
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
BEGIN
    -- Compter le total des questions pour ce concours
    SELECT COUNT(*) INTO v_total_questions
    FROM questions
    WHERE concours_id = p_concours_id;
    
    IF v_total_questions = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Aucune question trouvée pour ce concours'
        );
    END IF;
    
    -- Parcourir chaque question du concours
    FOR v_question IN 
        SELECT id, question_text, options, correct_answers, category_id, has_latex, image_url
        FROM questions 
        WHERE concours_id = p_concours_id
        ORDER BY display_order, id
    LOOP
        -- Chercher la réponse de l'utilisateur pour cette question
        v_user_answers := ARRAY[]::INTEGER[];
        
        FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
        LOOP
            IF (v_answer->>'question_id')::INTEGER = v_question.id THEN
                -- Convertir selected_options en tableau d'entiers
                IF jsonb_typeof(v_answer->'selected_options') = 'array' THEN
                    SELECT ARRAY_AGG(val::INTEGER)
                    INTO v_user_answers
                    FROM jsonb_array_elements_text(v_answer->'selected_options') AS val;
                END IF;
                EXIT;
            END IF;
        END LOOP;
        
        -- Si pas de réponse, tableau vide
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
        
        -- Ajouter à la correction
        v_correction := v_correction || jsonb_build_object(
            'question_id', v_question.id,
            'question_text', v_question.question_text,
            'category_id', v_question.category_id,
            'options', v_question.options,
            'correct_answers', v_question.correct_answers,
            'user_answers', v_user_answers,
            'is_correct', v_is_correct,
            'points', v_points,
            'has_latex', v_question.has_latex,
            'image_url', v_question.image_url
        );
    END LOOP;
    
    -- Calculer le pourcentage (basé sur les bonnes réponses)
    v_percentage := ROUND((v_correct_count::DECIMAL / v_total_questions) * 100, 2);
    
    -- Générer l'ID de soumission
    v_submission_id := gen_random_uuid();
    
    -- Insérer la soumission
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
-- ÉTAPE 6 : FONCTION get_correction (RÉCUPÈRE LA CORRECTION)
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
        'questions', v_submission.correction_data->'questions',
        'created_at', v_submission.created_at,
        'is_custom_exam', v_submission.is_custom_exam
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 7 : POLITIQUES DE SÉCURITÉ (RLS)
-- ═══════════════════════════════════════════════════════════════════

-- Activer RLS sur les tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE concours ENABLE ROW LEVEL SECURITY;
ALTER TABLE concours_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Politiques pour lecture publique des tables de base
CREATE POLICY "Lecture publique categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Lecture publique concours" ON concours FOR SELECT USING (true);
CREATE POLICY "Lecture publique concours_categories" ON concours_categories FOR SELECT USING (true);

-- ⚠️ IMPORTANT: La table questions N'A PAS de politique de lecture directe
-- Les questions doivent être lues via la VUE questions_public

-- Politique pour les soumissions
CREATE POLICY "Insertion soumissions" ON quiz_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Lecture propres soumissions" ON quiz_submissions FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 8 : ACCÈS À LA VUE PUBLIQUE
-- ═══════════════════════════════════════════════════════════════════

-- Donner accès à la vue publique (sans correct_answers)
GRANT SELECT ON questions_public TO anon, authenticated;
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT ON concours TO anon, authenticated;
GRANT SELECT ON concours_categories TO anon, authenticated;

-- Donner accès aux fonctions RPC
GRANT EXECUTE ON FUNCTION submit_quiz TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_correction TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- VÉRIFICATION
-- ═══════════════════════════════════════════════════════════════════

-- Vérifier que la vue n'expose pas correct_answers
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions_public' 
        AND column_name = 'correct_answers'
    ) THEN
        RAISE EXCEPTION 'ERREUR DE SÉCURITÉ: correct_answers est exposé dans questions_public!';
    END IF;
    
    RAISE NOTICE '✅ Vérification de sécurité OK: correct_answers n''est pas exposé';
END $$;

SELECT '✅ Script exécuté avec succès!' AS status;
```

---

## Service Frontend

Le service frontend ne doit **jamais** calculer le score localement. Il doit uniquement :
1. Charger les questions via la vue `questions_public`
2. Envoyer les réponses via la fonction RPC `submit_quiz`
3. Récupérer la correction via la fonction RPC `get_correction`

Voir le fichier `src/services/quizService.ts` pour l'implémentation.

---

## Flux de fonctionnement

```
┌─────────────────────────────────────────────────────────────┐
│  1. CANDIDAT CHARGE LES QUESTIONS                           │
│     SELECT * FROM questions_public                          │
│     → Reçoit: id, question_text, options, has_latex         │
│     → NE REÇOIT PAS: correct_answers                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  2. CANDIDAT RÉPOND AU QCM                                  │
│     Le frontend stocke temporairement les réponses          │
│     Format: [{ question_id: 1, selected_options: [0, 2] }]  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  3. CANDIDAT SOUMET                                         │
│     supabase.rpc('submit_quiz', {                           │
│       p_concours_id: 'enam',                                │
│       p_candidate_name: 'Jean Dupont',                      │
│       p_candidate_phone: '+226 70 00 00 00',                │
│       p_answers: [{ question_id: 1, selected_options: [1] }]│
│     })                                                      │
│                                                              │
│     → Supabase compare avec correct_answers (CÔTÉ SERVEUR)  │
│     → Calcule le score                                      │
│     → Stocke la soumission + correction_data                │
│     → Retourne: submission_id, score, total, percentage     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  4. ADMIN CONSULTE LA CORRECTION                            │
│     supabase.rpc('get_correction', {                        │
│       p_submission_id: 'uuid...'                            │
│     })                                                      │
│                                                              │
│     → Retourne les questions AVEC les bonnes réponses       │
│     → Affichage coloré: vert (correct), rouge (incorrect)   │
└─────────────────────────────────────────────────────────────┘
```

---

## Sécurité

### Ce qui est protégé

| Élément | Protection |
|---------|------------|
| `correct_answers` | Exclu de la vue `questions_public` |
| Table `questions` | Pas de politique SELECT directe |
| Fonctions RPC | SECURITY DEFINER (privilèges élevés) |
| IDs de soumission | UUID v4 (impossible à deviner) |

### Vérifications à faire

1. **Vérifier que correct_answers n'est pas exposé** :
```sql
SELECT * FROM questions_public LIMIT 1;
-- Doit retourner SANS la colonne correct_answers
```

2. **Vérifier que la table questions n'est pas accessible directement** :
```sql
-- Depuis le frontend, cette requête ne doit PAS fonctionner
SELECT correct_answers FROM questions;
```

3. **Tester le flux complet** :
   - Passer un QCM
   - Vérifier que le score est correct
   - Cliquer sur le lien de correction
   - Vérifier que les couleurs s'affichent

---

## Dépannage

### Erreur "function submit_quiz does not exist"

**Cause** : Les fonctions RPC ne sont pas créées.

**Solution** : Ré-exécutez le script SQL complet ci-dessus.

### Score toujours à 0

**Cause possible** : Le format des réponses envoyées ne correspond pas.

**Vérification** :
```javascript
// Format CORRECT des réponses
[
  { question_id: 1, selected_options: [0] },
  { question_id: 2, selected_options: [1, 2] },
  // ...
]
```

### Correction vide

**Cause** : `correction_data` n'est pas rempli lors de la soumission.

**Solution** : Vérifiez que la fonction `submit_quiz` insère bien `correction_data`.

### Page de correction ne s'affiche pas

**Cause** : L'ID de soumission est invalide ou la fonction `get_correction` ne fonctionne pas.

**Vérification** :
```sql
SELECT * FROM quiz_submissions ORDER BY created_at DESC LIMIT 1;
```

---

## Commandes utiles

### Lancer la migration des questions
```bash
npm run migrate
```

### Vérifier les données dans Supabase
```sql
-- Compter les questions
SELECT concours_id, COUNT(*) FROM questions GROUP BY concours_id;

-- Vérifier les soumissions récentes
SELECT id, candidate_name, score, total_questions, created_at 
FROM quiz_submissions 
ORDER BY created_at DESC LIMIT 5;
```

### Supprimer toutes les soumissions de test
```sql
DELETE FROM quiz_submissions WHERE candidate_name LIKE '%Test%';
```
