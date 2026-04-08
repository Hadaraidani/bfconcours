# 🗄️ SQL — Table `scheduled_results` pour le système de délibération

## Description

Cette table stocke les résultats en attente d'envoi. Après la soumission d'un QCM, le résultat est enregistré ici avec le statut `pending`. L'administrateur peut ensuite programmer une date d'envoi ou envoyer immédiatement.

---

## Script SQL complet

Exécutez ce script dans l'éditeur SQL de votre Dashboard Supabase.

```sql
-- ═══════════════════════════════════════════════════════════════════
-- TABLE: scheduled_results (Envois programmés des résultats)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scheduled_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  user_email TEXT,
  user_phone TEXT,
  candidate_name TEXT,
  concours_name TEXT,
  score INTEGER,
  score_final INTEGER,
  total_questions INTEGER,
  correct_answers INTEGER,
  wrong_answers INTEGER,
  unanswered INTEGER,
  proctoring_penalty INTEGER DEFAULT 0,
  correction_url TEXT,
  scheduled_at TIMESTAMPTZ,  -- NULL si pas encore programmé
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'error')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- INDEX pour la requête CRON (envois programmés à traiter)
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX idx_scheduled_results_pending 
  ON scheduled_results (status, scheduled_at) 
  WHERE status = 'pending';

CREATE INDEX idx_scheduled_results_submission 
  ON scheduled_results (submission_id);

-- ═══════════════════════════════════════════════════════════════════
-- RLS POLICIES (Row Level Security)
-- ═══════════════════════════════════════════════════════════════════

-- Activer RLS
ALTER TABLE scheduled_results ENABLE ROW LEVEL SECURITY;

-- Autoriser TOUTES les opérations (la table est gérée côté admin uniquement)
-- Si vous souhaitez restreindre l'accès, ajustez ces politiques
CREATE POLICY "Allow all operations on scheduled_results"
  ON scheduled_results
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════
-- COMMENTAIRES
-- ═══════════════════════════════════════════════════════════════════

COMMENT ON TABLE scheduled_results IS 'Résultats en attente d''envoi par email (système de délibération)';
COMMENT ON COLUMN scheduled_results.submission_id IS 'Identifiant de la soumission dans quiz_submissions';
COMMENT ON COLUMN scheduled_results.scheduled_at IS 'Date/heure programmée pour l''envoi (NULL = non programmé)';
COMMENT ON COLUMN scheduled_results.status IS 'Statut: pending (en attente), sent (envoyé), error (erreur)';
COMMENT ON COLUMN scheduled_results.sent_at IS 'Date/heure réelle de l''envoi';
```

---

## Vérification

Après exécution, vérifiez :

```sql
-- La table existe
SELECT * FROM scheduled_results LIMIT 5;

-- Les index sont créés
SELECT indexname FROM pg_indexes WHERE tablename = 'scheduled_results';

-- RLS est activé
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'scheduled_results';
```
