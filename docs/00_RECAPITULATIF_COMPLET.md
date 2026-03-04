# Récapitulatif Complet - Configuration du Site QCM

Ce document résume **toutes les étapes** pour que votre site fonctionne correctement.

---

## Étape 1 : Créer les tables dans Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Ouvrez votre projet
3. Allez dans **SQL Editor**
4. Copiez **tout** le script SQL de `docs/01_SCRIPT_SQL_COMPLET.md`
5. Cliquez **Run**
6. Vérifiez qu'il n'y a pas d'erreur

### Vérification
```sql
-- Exécutez cette requête pour vérifier
SELECT 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as tables_count,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') as views_count,
    (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('submit_quiz', 'get_correction')) as functions_count;
```

Résultat attendu :
- `tables_count`: 5
- `views_count`: 1
- `functions_count`: 2

---

## Étape 2 : Configurer le fichier .env

Créez ou modifiez le fichier `.env` à la racine de votre projet :

```env
# Supabase
VITE_SUPABASE_URL=https://VOTRE_PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...votre_cle_anon...
SUPABASE_SERVICE_KEY=eyJ...votre_cle_service_role...

# URL du site (pour les liens de correction)
VITE_SITE_URL=https://votre-site.netlify.app

# EmailJS
VITE_EMAILJS_SERVICE_ID=service_xxx
VITE_EMAILJS_TEMPLATE_ID=template_xxx
VITE_EMAILJS_PUBLIC_KEY=xxx
VITE_ADMIN_EMAIL=admin@exemple.com
```

### Où trouver les clés Supabase ?
1. Allez dans **Settings** → **API**
2. **URL** : Copiez l'URL du projet
3. **anon key** : Clé publique (safe to use in a browser)
4. **service_role key** : Clé secrète (NE JAMAIS exposer côté client)

---

## Étape 3 : Migrer les questions

1. Ouvrez un terminal dans le dossier du projet
2. Exécutez :

```bash
npm run migrate
```

3. Vérifiez la sortie :

```
════════════════════════════════════════════════════════════
 MIGRATION questions-migration.ts → Supabase
════════════════════════════════════════════════════════════

[1/5] Vérification de la configuration
✓ URL Supabase: https://xxx.supabase.co
✓ Clé service_role configurée

[2/5] Chargement de questions-migration.ts
✓ 24 catégories trouvées
✓ 5 concours trouvés
✓ 235 questions trouvées

...

[5/5] Vérification finale
✓ 24 catégories en base
✓ 5 concours en base
✓ 235 questions en base

════════════════════════════════════════════════════════════
✅ MIGRATION RÉUSSIE !
════════════════════════════════════════════════════════════
```

### Vérification dans Supabase
1. Allez dans **Table Editor**
2. Vérifiez :
   - `categories` : 24 lignes
   - `concours` : 5 lignes
   - `questions` : 235 lignes

---

## Étape 4 : Configurer EmailJS

1. Allez sur [emailjs.com](https://www.emailjs.com/)
2. Ouvrez votre template `template_qcm_resultats`
3. Remplacez le contenu par celui de `docs/02_TEMPLATE_EMAILJS.md`
4. Cliquez **Save**

### Variables du template
- `{{candidate_name}}` - Nom du candidat
- `{{candidate_phone}}` - Téléphone
- `{{concours_name}}` - Nom du concours
- `{{submission_date}}` - Date de soumission
- `{{score}}` - Score obtenu
- `{{total_questions}}` - Total questions
- `{{correct_count}}` - Bonnes réponses
- `{{wrong_count}}` - Mauvaises réponses
- `{{unanswered_count}}` - Sans réponse
- `{{correction_url}}` - Lien de correction

---

## Étape 5 : Tester le site

### Test 1 : Vérifier le chargement des questions
1. Lancez le site : `npm run dev`
2. Ouvrez la console (F12)
3. Vous devriez voir :
   ```
   5 concours trouvés dans Supabase
     - ENAM - Administration Générale: 56 questions, 7 catégories
     - ENAREF - Impôts et Domaines: 44 questions, 6 catégories
     ...
   ✅ Données chargées depuis Supabase: 5 concours
   ```

### Test 2 : Vérifier le calcul du score
1. Passez un QCM complet
2. Soumettez vos réponses
3. Dans la console, vous devriez voir :
   ```
   📤 Soumission sécurisée via Supabase RPC...
   ✅ Score calculé par Supabase: XX / YY
   ```

### Test 3 : Vérifier l'email
1. Vérifiez que vous recevez l'email
2. Vérifiez que le score est correct
3. Vérifiez que les statistiques sont correctes

### Test 4 : Vérifier la correction
1. Cliquez sur le lien "Voir la correction détaillée" dans l'email
2. Vérifiez que :
   - Le score affiché est correct
   - Les bonnes réponses cochées sont en **vert foncé**
   - Les bonnes réponses oubliées sont en **vert clair pointillé**
   - Les mauvaises réponses sont en **rouge**

---

## Dépannage

### "0 questions" s'affiche sur le site
1. Vérifiez que la migration a réussi (`npm run migrate`)
2. Vérifiez dans Supabase → Table Editor que les tables contiennent des données
3. Vérifiez que la vue `questions_public` existe et contient des données :
   ```sql
   SELECT COUNT(*) FROM questions_public;
   ```

### Le score ne correspond pas
1. Vérifiez que la fonction `submit_quiz` existe :
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'submit_quiz';
   ```
2. Si elle n'existe pas, ré-exécutez le script SQL complet

### Le lien de correction ne fonctionne pas
1. Vérifiez que la fonction `get_correction` existe :
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'get_correction';
   ```
2. Vérifiez que la soumission existe :
   ```sql
   SELECT id, score, total_questions FROM quiz_submissions ORDER BY created_at DESC LIMIT 5;
   ```

### L'email n'est pas reçu
1. Vérifiez la configuration EmailJS dans `.env`
2. Vérifiez la console pour les erreurs d'envoi
3. Vérifiez que le template EmailJS est correctement configuré

---

## Fichiers importants

| Fichier | Description |
|---------|-------------|
| `docs/01_SCRIPT_SQL_COMPLET.md` | Script SQL pour créer les tables |
| `docs/02_TEMPLATE_EMAILJS.md` | Template HTML pour les emails |
| `src/data/questions-migration.ts` | Fichier source des questions |
| `scripts/migrate-to-supabase.cjs` | Script de migration |
| `src/services/quizService.ts` | Service pour soumettre les quiz |
| `src/components/CorrectionPage.tsx` | Page de correction |

---

## Architecture sécurisée

```
┌─────────────────────────────────────────────────────────────┐
│  1. CANDIDAT CHARGE LES QUESTIONS                           │
│     → SELECT * FROM questions_public                        │
│     → Reçoit les questions SANS correct_answers             │
│     → Impossible de tricher !                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  2. CANDIDAT SOUMET SES RÉPONSES                            │
│     → supabase.rpc('submit_quiz', {...})                    │
│     → Supabase compare avec correct_answers CÔTÉ SERVEUR    │
│     → Stocke la correction dans quiz_submissions            │
│     → Retourne: submission_id, score, statistiques          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  3. EMAIL ENVOYÉ À L'ADMIN                                  │
│     → Lien: https://site.com?correction=UUID                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  4. ADMIN CONSULTE LA CORRECTION                            │
│     → supabase.rpc('get_correction', {p_submission_id})     │
│     → Récupère les questions AVEC les bonnes réponses       │
│     → Affiche la correction colorée                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Checklist finale

- [ ] Script SQL exécuté dans Supabase
- [ ] Migration réussie (`npm run migrate`)
- [ ] Questions visibles dans Supabase → Table Editor
- [ ] Template EmailJS configuré
- [ ] Test : Le site affiche les questions
- [ ] Test : Le score est calculé par Supabase
- [ ] Test : L'email est reçu avec le bon score
- [ ] Test : Le lien de correction fonctionne
- [ ] Test : Les couleurs de correction sont correctes
