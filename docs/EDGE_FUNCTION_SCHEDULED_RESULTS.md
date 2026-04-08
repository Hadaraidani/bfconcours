# ⚡ Edge Function + CRON — Envoi automatique des résultats programmés

## Description

Cette Edge Function Supabase vérifie toutes les 5 minutes s'il y a des résultats à envoyer (statut `pending` et `scheduled_at <= now()`), puis envoie les emails via EmailJS et met à jour le statut.

---

## 1. Edge Function Supabase (Deno)

### Fichier : `supabase/functions/send-scheduled-results/index.ts`

```typescript
// Edge Function Supabase : Envoi automatique des résultats programmés
// Déploiement : supabase functions deploy send-scheduled-results

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Configuration EmailJS
const EMAILJS_SERVICE_ID = 'service_1jwug48'
const EMAILJS_TEMPLATE_ID_ADMIN = 'template_a2antsk'
const EMAILJS_TEMPLATE_ID_CANDIDATE = 'template_candidate'
const EMAILJS_PUBLIC_KEY = 'TON_PUBLIC_KEY_EMAILJS' // À remplacer
const ADMIN_EMAIL = 'siteheberge86@gmail.com'

interface ScheduledResult {
  id: string
  submission_id: string
  user_email: string | null
  user_phone: string | null
  candidate_name: string | null
  concours_name: string | null
  score: number | null
  score_final: number | null
  total_questions: number | null
  correct_answers: number | null
  wrong_answers: number | null
  unanswered: number | null
  proctoring_penalty: number | null
  correction_url: string | null
}

// Envoyer un email via l'API REST EmailJS
async function sendEmailJS(
  serviceId: string,
  templateId: string,
  templateParams: Record<string, unknown>,
  publicKey: string
): Promise<boolean> {
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        template_params: templateParams,
        user_id: publicKey,
      }),
    })
    
    if (!response.ok) {
      const text = await response.text()
      console.error(`❌ EmailJS error: ${response.status} - ${text}`)
      return false
    }
    
    console.log('✅ Email envoyé avec succès')
    return true
  } catch (error) {
    console.error('❌ Exception EmailJS:', error)
    return false
  }
}

Deno.serve(async (req) => {
  try {
    console.log('🔄 Début du traitement des envois programmés...')
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. Récupérer les résultats à envoyer
    const { data: pendingResults, error: fetchError } = await supabase
      .from('scheduled_results')
      .select('*')
      .eq('status', 'pending')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(50) // Traiter par lots de 50

    if (fetchError) {
      console.error('❌ Erreur récupération:', fetchError)
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 })
    }

    if (!pendingResults || pendingResults.length === 0) {
      console.log('ℹ️ Aucun envoi en attente')
      return new Response(JSON.stringify({ message: 'Aucun envoi en attente', processed: 0 }))
    }

    console.log(`📋 ${pendingResults.length} résultat(s) à traiter`)

    let sent = 0
    let errors = 0

    for (const result of pendingResults as ScheduledResult[]) {
      try {
        console.log(`📧 Traitement: ${result.candidate_name} (${result.id})`)

        let emailSent = false

        // Envoyer à l'admin
        const adminSent = await sendEmailJS(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID_ADMIN,
          {
            to_email: ADMIN_EMAIL,
            candidate_name: result.candidate_name || 'Candidat',
            candidate_phone: result.user_phone || '',
            concours_name: result.concours_name || '',
            score: result.score ?? 0,
            score_final: result.score_final ?? result.score ?? 0,
            total_questions: result.total_questions ?? 0,
            correct_count: result.correct_answers ?? 0,
            wrong_count: result.wrong_answers ?? 0,
            unanswered_count: result.unanswered ?? 0,
            proctoring_penalty: Math.abs(result.proctoring_penalty ?? 0),
            correction_url: result.correction_url || '',
            submission_date: new Date().toLocaleDateString('fr-FR'),
          },
          EMAILJS_PUBLIC_KEY
        )

        // Envoyer au candidat (si email disponible)
        if (result.user_email) {
          const scoreFinal = result.score_final ?? result.score ?? 0
          const total = result.total_questions ?? 0
          const percentage = total > 0 ? Math.round((scoreFinal / total) * 100) : 0

          const candidateSent = await sendEmailJS(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID_CANDIDATE,
            {
              to_email: result.user_email,
              candidate_name: result.candidate_name || 'Candidat',
              concours_name: result.concours_name || '',
              score: scoreFinal,
              total_questions: total,
              bonnes_reponses: result.correct_answers ?? 0,
              mauvaises_reponses: result.wrong_answers ?? 0,
              sans_reponse: result.unanswered ?? 0,
              percentage,
              correction_url: result.correction_url || '',
              submission_date: new Date().toLocaleDateString('fr-FR'),
            },
            EMAILJS_PUBLIC_KEY
          )

          emailSent = adminSent || candidateSent
        } else {
          emailSent = adminSent
        }

        // Mettre à jour le statut
        if (emailSent) {
          await supabase
            .from('scheduled_results')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', result.id)
          sent++
          console.log(`✅ Envoyé: ${result.candidate_name}`)
        } else {
          await supabase
            .from('scheduled_results')
            .update({ status: 'error', error_message: 'Échec envoi EmailJS' })
            .eq('id', result.id)
          errors++
          console.log(`❌ Échec: ${result.candidate_name}`)
        }

        // Pause de 500ms entre chaque envoi pour éviter le rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (err) {
        console.error(`❌ Exception pour ${result.id}:`, err)
        await supabase
          .from('scheduled_results')
          .update({ 
            status: 'error', 
            error_message: err instanceof Error ? err.message : 'Erreur inconnue' 
          })
          .eq('id', result.id)
        errors++
      }
    }

    const summary = `Traitement terminé: ${sent} envoyé(s), ${errors} erreur(s)`
    console.log(`📊 ${summary}`)

    return new Response(JSON.stringify({ 
      message: summary,
      processed: pendingResults.length,
      sent,
      errors 
    }))

  } catch (error) {
    console.error('❌ Erreur globale:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500 }
    )
  }
})
```

---

## 2. Déploiement de la Edge Function

### Prérequis

```bash
# Installer le CLI Supabase si pas déjà fait
npm install -g supabase
```

### Créer et déployer

```bash
# Se connecter à Supabase
supabase login

# Lier au projet
supabase link --project-ref VOTRE_PROJECT_REF

# Créer la fonction
supabase functions new send-scheduled-results

# Copier le code ci-dessus dans supabase/functions/send-scheduled-results/index.ts

# Déployer
supabase functions deploy send-scheduled-results --no-verify-jwt
```

### Variables d'environnement

Dans le Dashboard Supabase → Settings → Edge Functions → Secrets :

| Variable | Valeur |
|----------|--------|
| `SUPABASE_URL` | (déjà configuré automatiquement) |
| `SUPABASE_SERVICE_ROLE_KEY` | (déjà configuré automatiquement) |

⚠️ **Important** : Remplacez `EMAILJS_PUBLIC_KEY` dans le code de la fonction par votre clé publique EmailJS.

---

## 3. Configuration CRON (pg_cron)

### Méthode 1 : Via pg_cron (dans Supabase SQL Editor)

```sql
-- Activer l'extension pg_cron (si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Planifier l'exécution toutes les 5 minutes
SELECT cron.schedule(
  'send-scheduled-results',           -- Nom du job
  '*/5 * * * *',                       -- Toutes les 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://VOTRE_PROJECT_REF.supabase.co/functions/v1/send-scheduled-results',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || 'VOTRE_SUPABASE_ANON_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

⚠️ Remplacez :
- `VOTRE_PROJECT_REF` par la référence de votre projet Supabase
- `VOTRE_SUPABASE_ANON_KEY` par votre clé anonyme Supabase

### Méthode 2 : Via pg_net (alternative si pg_cron n'est pas disponible)

```sql
-- Activer pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Créer la fonction d'appel
CREATE OR REPLACE FUNCTION call_send_scheduled_results()
RETURNS void AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://VOTRE_PROJECT_REF.supabase.co/functions/v1/send-scheduled-results',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || 'VOTRE_SUPABASE_ANON_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql;
```

### Vérifier le CRON

```sql
-- Lister les jobs planifiés
SELECT * FROM cron.job;

-- Voir l'historique d'exécution
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Supprimer le CRON (si besoin)

```sql
SELECT cron.unschedule('send-scheduled-results');
```

---

## 4. Test manuel

Vous pouvez tester la Edge Function manuellement :

```bash
curl -X POST https://VOTRE_PROJECT_REF.supabase.co/functions/v1/send-scheduled-results \
  -H "Authorization: Bearer VOTRE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

Ou depuis le Dashboard Supabase → Edge Functions → send-scheduled-results → Invoke.
