# Guide de configuration de l'authentification Supabase

Ce guide vous explique comment configurer l'authentification avec Supabase pour votre site QCM.

---

## ⚠️ PROBLÈME COURANT : "Email rate limit exceeded" ou "Limite de tentatives"

### Cause
Supabase limite le nombre d'emails de confirmation à **4 par heure** par défaut. Si vous avez fait plusieurs tests d'inscription, vous avez atteint cette limite.

### Solution 1 : Désactiver la confirmation email (RECOMMANDÉ pour les tests)

1. Allez sur [supabase.com](https://supabase.com) et ouvrez votre projet
2. Allez dans **Authentication** > **Providers**
3. Cliquez sur **Email**
4. **Désactivez** l'option **"Confirm email"** (mettez sur **OFF**)
5. Cliquez sur **Save**

![Désactiver Confirm Email](https://i.imgur.com/example.png)

Maintenant les utilisateurs peuvent s'inscrire **sans confirmation email**.

### Solution 2 : Attendre
La limite se réinitialise après **1 heure**. Vous pouvez simplement attendre.

### Solution 3 : Utiliser un autre email
Chaque adresse email a sa propre limite. Utilisez une autre adresse pour tester.

### Solution 4 : Augmenter la limite (plan Pro)
Si vous avez le plan Pro, allez dans **Authentication** > **Rate Limits** pour augmenter les limites.

---

## Table des matières

1. [Création d'un projet Supabase](#1-création-dun-projet-supabase)
2. [Configuration de la base de données](#2-configuration-de-la-base-de-données)
3. [Configuration des variables d'environnement](#3-configuration-des-variables-denvironnement)
4. [Test de l'authentification](#4-test-de-lauthentification)
5. [Déploiement sur Netlify](#5-déploiement-sur-netlify)
6. [Dépannage](#6-dépannage)

---

## 1. Création d'un projet Supabase

### Étape 1 : Créer un compte

1. Allez sur [supabase.com](https://supabase.com/)
2. Cliquez sur **"Start your project"**
3. Connectez-vous avec votre compte GitHub

### Étape 2 : Créer un nouveau projet

1. Cliquez sur **"New Project"**
2. Remplissez les informations :
   - **Name** : `qcm-concours-bf` (ou le nom de votre choix)
   - **Database Password** : Générez un mot de passe fort et **sauvegardez-le**
   - **Region** : Choisissez la région la plus proche (Europe West pour l'Afrique)
3. Cliquez sur **"Create new project"**
4. Attendez quelques minutes pendant la création

### Étape 3 : Récupérer les clés API

1. Une fois le projet créé, allez dans **Settings** > **API**
2. Copiez :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 2. Configuration de la base de données

### ⚠️ IMPORTANT : Script SQL complet avec Trigger

Le trigger est **obligatoire** pour que le profil soit créé automatiquement lors de l'inscription.

1. Dans votre projet Supabase, allez dans **SQL Editor**
2. Cliquez sur **"New query"**
3. **Copiez et exécutez ce SQL complet** :

```sql
-- =====================================================
-- SCRIPT COMPLET POUR L'AUTHENTIFICATION QCM CONCOURS
-- =====================================================

-- 1. SUPPRIMER L'ANCIENNE TABLE SI ELLE EXISTE
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. CRÉER LA TABLE USERS
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ACTIVER ROW LEVEL SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. SUPPRIMER LES ANCIENNES POLITIQUES
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Service role can do everything" ON public.users;

-- 5. CRÉER LES NOUVELLES POLITIQUES RLS

-- Politique : Tout le monde peut voir les profils (pour l'admin)
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.users
  FOR SELECT
  USING (true);

-- Politique : Les utilisateurs authentifiés peuvent insérer leur propre profil
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Politique : Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. CRÉER LA FONCTION TRIGGER POUR CRÉER LE PROFIL AUTOMATIQUEMENT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, phone, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Utilisateur'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Si l'utilisateur existe déjà, on ne fait rien
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log l'erreur mais ne bloque pas l'inscription
    RAISE WARNING 'Erreur création profil: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 7. SUPPRIMER L'ANCIEN TRIGGER S'IL EXISTE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 8. CRÉER LE TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 9. CRÉER UN INDEX POUR AMÉLIORER LES PERFORMANCES
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 10. ACCORDER LES PERMISSIONS NÉCESSAIRES
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- TABLE QUIZ_ATTEMPTS (HISTORIQUE DES ACTIVITÉS)
-- =====================================================

-- 11. SUPPRIMER L'ANCIENNE TABLE SI ELLE EXISTE
DROP TABLE IF EXISTS public.quiz_attempts CASCADE;

-- 12. CRÉER LA TABLE QUIZ_ATTEMPTS
CREATE TABLE public.quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  concours_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  wrong_answers INTEGER NOT NULL,
  unanswered INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  is_custom_exam BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. ACTIVER ROW LEVEL SECURITY POUR QUIZ_ATTEMPTS
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 14. CRÉER LES POLITIQUES RLS POUR QUIZ_ATTEMPTS

-- Les utilisateurs peuvent voir leurs propres tentatives
CREATE POLICY "Users can view own attempts"
  ON public.quiz_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Les utilisateurs peuvent insérer leurs propres tentatives
CREATE POLICY "Users can insert own attempts"
  ON public.quiz_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 15. CRÉER DES INDEX POUR AMÉLIORER LES PERFORMANCES
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON public.quiz_attempts(created_at DESC);

-- 16. ACCORDER LES PERMISSIONS
GRANT ALL ON public.quiz_attempts TO anon, authenticated;

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
```

4. Cliquez sur **"Run"** pour exécuter le script
5. Vous devriez voir **"Success. No rows returned"**

### Vérifier que le trigger est créé

1. Allez dans **Database** > **Functions**
2. Vous devriez voir `handle_new_user` dans la liste

### Vérifier la table

1. Allez dans **Table Editor**
2. Vous devriez voir la table `users` avec les colonnes :
   - `id` (uuid)
   - `full_name` (text)
   - `email` (text)
   - `phone` (text)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

---

## 3. Configuration des variables d'environnement

### En développement local

1. Créez un fichier `.env` à la racine de votre projet :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Remplacez les valeurs par celles de votre projet Supabase

3. **IMPORTANT** : Ajoutez `.env` à votre `.gitignore` :

```gitignore
.env
.env.local
```

### Structure du fichier `.env` complet

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# EmailJS (optionnel)
VITE_EMAILJS_SERVICE_ID=service_qcm_bf
VITE_EMAILJS_TEMPLATE_ID=template_qcm_resultats
VITE_EMAILJS_PUBLIC_KEY=votre_cle_publique

# Site
VITE_SITE_URL=https://votre-domaine.com
VITE_ADMIN_EMAIL=admin@votre-domaine.com
```

---

## 4. Test de l'authentification

### Démarrer le serveur de développement

```bash
npm run dev
```

### Tester l'inscription

1. Allez sur votre site (http://localhost:5173)
2. Cliquez sur **"Créer un compte"**
3. Remplissez :
   - Nom complet
   - Email
   - Téléphone (optionnel)
   - Mot de passe (minimum 6 caractères)
   - Confirmation du mot de passe
4. Cliquez sur **"S'inscrire"**
5. **Vous devriez voir** : "Inscription réussie ! Bienvenue [Votre nom]"

### Vérifier dans Supabase

1. Allez dans **Authentication** > **Users** pour voir les utilisateurs inscrits
2. Allez dans **Table Editor** > **users** pour voir les profils

### Tester la connexion

1. Déconnectez-vous si nécessaire
2. Cliquez sur **"Se connecter"**
3. Entrez vos identifiants
4. Vous devriez être redirigé vers l'accueil avec votre nom affiché dans le header

---

## 5. Déploiement sur Netlify

### Configurer les variables d'environnement sur Netlify

1. Allez sur [netlify.com](https://www.netlify.com/) et connectez-vous
2. Sélectionnez votre site
3. Allez dans **Site settings** > **Environment variables**
4. Ajoutez les variables :

| Variable | Valeur |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

5. **Redéployez** votre site pour appliquer les changements

### Configurer les URLs autorisées dans Supabase

1. Dans Supabase, allez dans **Authentication** > **URL Configuration**
2. Configurez :
   - **Site URL** : `https://votre-site.netlify.app`
   - **Redirect URLs** : 
     - `https://votre-site.netlify.app`
     - `https://votre-site.netlify.app/*`
     - `http://localhost:5173` (pour le développement)

---

## 6. Dépannage

### Problème : "Erreur création profil: new row violates row-level security policy"

**Cause** : Les anciennes politiques RLS bloquent l'insertion.

**Solution** :
1. Exécutez le script SQL complet ci-dessus (il supprime les anciennes politiques)
2. Le trigger `handle_new_user` créera automatiquement le profil

### Problème : Le nom n'apparaît pas après l'inscription

**Cause** : Le profil n'a pas été créé dans la table `users`.

**Solution** :
1. Vérifiez que le trigger existe : **Database** > **Functions** > `handle_new_user`
2. Vérifiez les logs : **Logs** > **Postgres Logs**
3. Si le trigger n'existe pas, réexécutez le script SQL complet

### Problème : "Supabase non configuré"

**Cause** : Les variables d'environnement ne sont pas définies.

**Solution** :
1. Vérifiez que le fichier `.env` existe
2. Vérifiez que les variables commencent par `VITE_`
3. Redémarrez le serveur de développement

### Problème : "Invalid API key"

**Cause** : La clé API est incorrecte.

**Solution** :
1. Allez dans Supabase > Settings > API
2. Copiez la clé `anon public` (pas la `service_role`)
3. Collez-la dans votre `.env`

### Problème : "Email not confirmed"

**Cause** : La confirmation par email est activée.

**Solution** :
1. Allez dans **Authentication** > **Providers** > **Email**
2. Désactivez **"Confirm email"** pour les tests
3. Ou vérifiez votre email et cliquez sur le lien de confirmation

### Problème : "Email rate limit exceeded" / "Limite de tentatives atteinte"

**Cause** : Vous avez dépassé la limite de 4 emails de confirmation par heure.

**Solution** :
1. **Désactiver la confirmation email** :
   - Allez dans **Authentication** > **Providers** > **Email**
   - Désactivez **"Confirm email"**
   - Cliquez sur **Save**
2. **OU** attendez 1 heure avant de réessayer
3. **OU** utilisez une autre adresse email pour tester

### Problème : Page blanche après connexion

**Cause** : Erreur JavaScript.

**Solution** :
1. Ouvrez la console du navigateur (F12)
2. Regardez les erreurs en rouge
3. Vérifiez que toutes les dépendances sont installées : `npm install`

### Comment vérifier que tout fonctionne

1. **Dans Supabase > Authentication > Users** : Vous devez voir l'utilisateur
2. **Dans Supabase > Table Editor > users** : Vous devez voir le profil avec le nom
3. **Sur le site** : Le nom doit apparaître dans le header après connexion

---

## Résumé des fichiers du projet

| Fichier | Description |
|---------|-------------|
| `src/config/supabase.ts` | Configuration du client Supabase |
| `src/contexts/AuthContext.tsx` | Contexte React pour l'authentification |
| `src/components/auth/LoginPage.tsx` | Page de connexion |
| `src/components/auth/RegisterPage.tsx` | Page d'inscription |
| `src/components/auth/UserProfile.tsx` | Modal du profil utilisateur |
| `src/App.tsx` | Intégration de l'authentification |
| `src/main.tsx` | Provider d'authentification |
| `.env` | Variables d'environnement (à créer) |

---

## Fonctionnalités incluses

- ✅ Inscription avec email/mot de passe
- ✅ Connexion/Déconnexion
- ✅ Création automatique du profil via trigger
- ✅ Profil utilisateur modifiable
- ✅ Affichage du nom dans le header
- ✅ Protection des routes
- ✅ Pré-remplissage du formulaire pour les utilisateurs connectés
- ✅ Messages d'erreur détaillés
- ✅ Fonctionne sans Supabase configuré (authentification désactivée)

---

## Support

Si vous rencontrez des problèmes :
1. Vérifiez la console du navigateur (F12)
2. Vérifiez les logs dans Supabase > Logs
3. Consultez la documentation Supabase : https://supabase.com/docs
