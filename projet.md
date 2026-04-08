# 📋 Projet QCM Concours BF — Documentation Complète

## 🎯 Description Générale

**QCM Concours BF** est une plateforme web de préparation aux concours directs du Burkina Faso (ENAM, ENAREF, etc.). Elle permet aux candidats de s'entraîner avec des QCM chronométrés, corrigés automatiquement, dans un environnement sécurisé avec surveillance anti-triche (proctoring).

**URL de production** : Déployé sur **Netlify**  
**Langue** : Français  
**Public cible** : Candidats aux concours de la fonction publique du Burkina Faso

---

## 🛠️ Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Frontend** | React + TypeScript | React 19.2, TS 5.9 |
| **Bundler** | Vite | 7.2 |
| **CSS** | TailwindCSS | 4.1 |
| **Backend / BDD** | Supabase (PostgreSQL) | supabase-js 2.98 |
| **Authentification** | Supabase Auth | intégré |
| **Emails** | EmailJS | 4.4 |
| **PDF** | jsPDF + QRCode | jsPDF 4.2 |
| **Math / LaTeX** | KaTeX + react-katex | 0.16 |
| **Icônes** | Lucide React | 0.575 |
| **Déploiement** | Netlify | via `netlify.toml` |
| **Utilitaires** | clsx, tailwind-merge, uuid, html2canvas | — |

### Build & Déploiement

```bash
npm run dev      # Serveur de développement Vite
npm run build    # Build production (npx vite build)
npm run preview  # Prévisualisation du build
npm run migrate  # Migration des données vers Supabase
```

Le plugin `vite-plugin-singlefile` est utilisé pour générer un seul fichier HTML en production.

---

## 📁 Structure du Projet

```
ExamenG/
├── index.html                    # Point d'entrée HTML
├── vite.config.ts                # Configuration Vite (React, TailwindCSS, SingleFile)
├── tsconfig.json                 # Config TypeScript (ES2020, alias @/ → src/)
├── netlify.toml                  # Config déploiement Netlify (SPA redirect)
├── .env                          # Variables d'environnement Supabase
├── package.json                  # Dépendances et scripts
├── public/images/                # Images statiques (emblème BF, etc.)
├── scripts/
│   └── migrate-to-supabase.cjs   # Script de migration des données
├── tools/
│   └── convert-to-migration.html # Outil de conversion pour migration
├── docs/                         # Documentation technique (15 fichiers .md)
│   ├── 01_SCRIPT_SQL_COMPLET.md  # Script SQL pour Supabase
│   ├── GUIDE_SUPABASE_AUTH.md    # Guide d'authentification
│   ├── GUIDE_SYSTEME_SCORE_SUPABASE.md # Système de score
│   └── ...
└── src/
    ├── main.tsx                  # Point d'entrée React
    ├── App.tsx                   # Composant principal (1122 lignes, routeur SPA)
    ├── index.css                 # Styles globaux
    ├── vite-env.d.ts             # Déclarations de types Vite
    ├── config/                   # Configuration
    │   ├── supabase.ts           # Client Supabase + auth (signUp/signIn/signOut/reset)
    │   ├── emailjs.ts            # Config EmailJS (service, templates, clé publique)
    │   ├── site.ts               # Config du site (mode, thèmes, durées)
    │   └── contact.ts            # Informations de contact (WhatsApp, Facebook, email)
    ├── types/
    │   └── index.ts              # Tous les types TypeScript
    ├── contexts/
    │   └── AuthContext.tsx        # Contexte d'authentification React
    ├── providers/
    │   └── DataProvider.tsx       # Fournisseur de données (Supabase ou local)
    ├── services/
    │   ├── quizService.ts        # Soumission de quiz via Supabase RPC
    │   ├── accessCodeService.ts  # Gestion des codes d'accès (individuel/universel)
    │   ├── roctoringService.ts   # Système anti-triche / proctoring
    │   ├── certificateService.ts # Génération de certificats PDF
    │   ├── activityService.ts    # Historique des tentatives
    │   └── notificationService.ts# Notifications in-app + emails candidats
    ├── utils/
    │   └── cn.ts                 # Utilitaire clsx + tailwind-merge
    ├── data/
    │   ├── questions.ts          # Questions de fallback (données locales)
    │   └── questions-migration.ts# Format de migration
    └── components/
        ├── index.ts              # Exports des composants
        ├── Header.tsx            # En-tête avec sélecteur de thème et auth
        ├── Footer.tsx            # Pied de page avec contacts
        ├── HeroBackground.tsx    # Arrière-plan animé de la page d'accueil
        ├── UserForm.tsx          # Formulaire d'inscription candidat (nom, prénom, tél.)
        ├── ConcoursSelection.tsx # Sélection du concours
        ├── CustomExamGenerator.tsx# Génération d'examen personnalisé
        ├── QuizPage.tsx          # Interface de passage du QCM (38K)
        ├── ResultPage.tsx        # Page de résultats (44K)
        ├── CorrectionPage.tsx    # Page de correction détaillée
        ├── CertificateDownload.tsx# Téléchargement du certificat PDF
        ├── MathRenderer.tsx      # Rendu LaTeX (KaTeX)
        ├── AccessCodeModal.tsx   # Modal de saisie du code d'accès
        ├── AdminDashboard.tsx    # Tableau de bord admin (64K)
        ├── AdminCodesPage.tsx    # Gestion des codes d'accès admin
        ├── NotificationCenter.tsx# Centre de notifications
        ├── NotificationToast.tsx # Toasts de notification
        ├── roctoringConsent.tsx  # Consentement de surveillance
        └── auth/
            ├── LoginPage.tsx     # Page de connexion
            ├── RegisterPage.tsx  # Page d'inscription
            ├── UserProfile.tsx   # Profil utilisateur + historique
            └── index.ts          # Exports auth
```

---

## 🏗️ Architecture Applicative

### Navigation (SPA sans routeur)

L'application utilise un système de **steps** (étapes) géré dans `App.tsx` au lieu d'un routeur :

```
home → login/register → userForm → concoursSelection → quiz → result → correction
                                  ↘ customExam ↗
```

**Steps possibles** : `home`, `login`, `register`, `userForm`, `concoursSelection`, `customExam`, `quiz`, `result`, `correction`

### Hiérarchie des Composants

```
<StrictMode>
  <AuthProvider>          ← Contexte d'authentification Supabase
    <DataProvider>        ← Fournisseur de données (Supabase/local)
      <App />             ← Routeur SPA principal
      <NotificationToast /> ← Toasts globaux
    </DataProvider>
  </AuthProvider>
</StrictMode>
```

### Modes de l'Application

Configurés dans `src/config/site.ts` :

| Mode | Description |
|------|-------------|
| `concours` | Affiche tous les concours disponibles (mode par défaut) |
| `examen` | Affiche uniquement un examen d'évaluation unique |
| `custom` | Permet de générer un examen personnalisé |

---

## 🔐 Sécurité — Architecture du Score

### Principe fondamental
**Le score est TOUJOURS calculé côté serveur (Supabase RPC).** Les réponses correctes ne sont JAMAIS envoyées au frontend.

### Flux de soumission

1. Le frontend charge les questions via la vue `questions_public` (SANS `correct_answers`)
2. Le candidat répond aux questions
3. Les réponses sont envoyées à la fonction RPC `submit_quiz` de Supabase
4. Supabase calcule le score et retourne le résultat
5. La correction détaillée est récupérée via la RPC `get_correction`

### Fonctions RPC Supabase

| Fonction | Description |
|----------|-------------|
| `submit_quiz` | Calcule le score d'un examen officiel côté serveur |
| `submit_custom_exam` | Calcule le score d'un examen personnalisé |
| `get_correction` | Récupère la correction détaillée d'une soumission |

### Système de notation

- ✅ **Bonne réponse** : +1 point
- ❌ **Mauvaise réponse** : -1 point
- ⬜ **Sans réponse** : 0 point
- 🔒 **Score final** = Score réponses − Pénalités de proctoring

---

## 🛡️ Système Anti-triche (Proctoring)

Service complet dans `roctoringService.ts` (809 lignes) :

| Violation | Pénalité | Sévérité |
|-----------|----------|----------|
| Changement d'onglet | -3 pts | 🔴 Grave |
| Perte de focus fenêtre | -2 pts | 🟠 Critique |
| Tentative copier | -1 pt | 🟡 Warning |
| Tentative coller | -1 pt | 🟡 Warning |
| Outils de développement (F12, Ctrl+Shift+I) | -5 pts | 🔴 Grave |
| Voir code source (Ctrl+U) | -5 pts | 🔴 Grave |
| Sortie plein écran | -2 pts | 🟠 Critique |
| Impression (Ctrl+P) | -2 pts | 🟠 Critique |
| Clic droit | -1 pt | 🟡 Warning |
| Rafraîchissement | -1 pt | 🟡 Warning |

**Score de confiance** : 0-100, calculé en temps réel  
**Combinaison secrète admin** : `Ctrl+Shift+Alt+D+E+V` (pour déverrouiller les outils de développement)

---

## 🔑 Système de Codes d'Accès

Deux types de codes gérés dans `accessCodeService.ts` :

| Type | Usage | Caractéristique |
|------|-------|-----------------|
| **Individuel** | 1 code = 1 candidat | Lié à un appareil (device_id) |
| **Universel** | 1 code = N candidats | Nombre max d'utilisations configurable |

**Format du code** : `XXXX-XXXX` (caractères alphanumériques sans ambiguïté I/O/0/1)  
**Mot de passe admin** : `QCM_ADMIN_2024` (dans le code)  
**Raccourci admin** : `Ctrl+Shift+A` pour accéder au dashboard admin

---

## 📊 Base de Données Supabase

### Tables principales

| Table | Description |
|-------|-------------|
| `concours` | Liste des concours (id, name, description, icon, duration, available) |
| `categories` | Matières/catégories (id, name, name_short) |
| `concours_categories` | Liaison concours ↔ catégories (questions_count, display_order) |
| `questions` | Questions avec `correct_answers` (jamais envoyé au frontend) |
| `questions_public` | **Vue sécurisée** sans `correct_answers` |
| `submissions` | Soumissions des candidats |
| `access_codes` | Codes d'accès (token, expires_at, is_universal, max_uses, device_id) |
| `users` | Profils utilisateurs (full_name, email, phone) |
| `quiz_attempts` | Historique des tentatives par utilisateur |

### Catégories de matières disponibles

`francais`, `maths`, `physique`, `svt`, `chimie`, `psychotechnique`, `culture`, `histoire`, `geographie`, `droit_constitutionnel`, `droit_administratif`, `droit_penal`, `droit_civil`, `economie`, `comptabilite`, `fiscalite`, `informatique`, `anglais`, `philosophie`, `sport`, `pedagogie`, `didactique`, `psychologie`, `biologie`, `anatomie`, `pharmacologie`, `soins_infirmiers`, `sante_publique`, `secourisme`, `education_civique`, `logique`, `raisonnement`

---

## 🎨 Thèmes et Design

5 thèmes configurables dans `config/site.ts` :

| Thème | Couleur primaire | Description |
|-------|------------------|-------------|
| `green` (défaut) | Emerald/Vert | Burkina Faso |
| `blue` | Blue/Indigo | Professionnel |
| `purple` | Purple/Violet | Moderne |
| `orange` | Orange/Amber | Dynamique |
| `red` | Red/Rose | Vif |

Le design utilise des **gradients TailwindCSS**, un **arrière-plan animé** (HeroBackground), et des **composants responsifs**.

---

## 📜 Certificat PDF

Généré par `certificateService.ts` avec jsPDF :

- **Format** : A4 paysage
- **Design** : Académique avec bordure dorée et emblème du Burkina Faso
- **QR Code** : Lien de vérification intégré
- **Mentions** : Excellent (≥90%), Très Bien (≥80%), Bien (≥70%), Assez Bien (≥60%), Passable (≥50%)
- **Éligibilité** : Score ≥ 50% ou Top 3

---

## 📧 Intégration EmailJS

| Paramètre | Valeur |
|------------|--------|
| Service ID | `service_1jwug48` |
| Template résultats | `template_a2antsk` |
| Template candidat | `template_candidate` |
| Admin email | `siteheberge86@gmail.com` |

---

## 📲 Informations de Contact

| Canal | Valeur |
|-------|--------|
| WhatsApp | +226 73 57 86 43 |
| Téléphone | +226 56 49 23 16 |
| Email | idanihadara48@gmail.com |
| Facebook | Aïdara Idani |
| Adresse | Ouagadougou, Burkina Faso |

---

## ⚡ Variables d'Environnement

```env
VITE_SUPABASE_URL=<URL du projet Supabase>
VITE_SUPABASE_ANON_KEY=<Clé anonyme Supabase>
SUPABASE_SERVICE_KEY=<Clé service (migration uniquement)>
```

---

## 📝 Fonctionnalités Existantes (Résumé)

1. ✅ **Page d'accueil** avec statistiques dynamiques et design animé
2. ✅ **Authentification** complète (inscription, connexion, profil, réinitialisation mot de passe)
3. ✅ **Sélection de concours** avec indication de disponibilité
4. ✅ **Examen personnalisé** (choix du nombre de questions, durée, matières)
5. ✅ **Interface de QCM** avec timer, navigation par question, progression
6. ✅ **Système de proctoring** avec pénalités en temps réel
7. ✅ **Codes d'accès** individuels et universels
8. ✅ **Calcul sécurisé du score** côté serveur (Supabase RPC)
9. ✅ **Page de résultats** avec statistiques détaillées
10. ✅ **Page de correction** accessible via lien partageable (`?correction=<submissionId>`)
11. ✅ **Certificat PDF** avec QR code et mentions
12. ✅ **Notifications** in-app (toasts) et emails aux candidats
13. ✅ **Dashboard admin** (Ctrl+Shift+A) pour gérer les codes d'accès
14. ✅ **Historique des tentatives** par utilisateur (Supabase + localStorage fallback)
15. ✅ **Rendu LaTeX** pour les formules mathématiques (KaTeX)
16. ✅ **5 thèmes de couleurs** interchangeables
17. ✅ **SEO** avec meta tags (description, keywords, theme-color)
18. ✅ **Responsive design** (mobile, tablette, desktop)
19. ✅ **Support hors-ligne partiel** (données locales en fallback)

---

---

# 🤖 PROMPT POUR UNE IA — Ajout de Fonctionnalités

> Copie ce prompt complet et donne-le à une IA pour qu'elle puisse ajouter des fonctionnalités au site.

---

## Contexte du Projet

Tu travailles sur **QCM Concours BF**, une plateforme web de préparation aux concours de la fonction publique du Burkina Faso. C'est une **SPA (Single Page Application)** sans routeur classique qui utilise un système d'étapes (`step`) dans `App.tsx`.

### Stack technique

- **Frontend** : React 19 + TypeScript 5.9 + TailwindCSS 4.1
- **Bundler** : Vite 7.2 (avec `vite-plugin-singlefile`)
- **Backend** : Supabase (PostgreSQL + Auth + RPC Functions)
- **Emails** : EmailJS
- **PDF** : jsPDF + QRCode
- **Math** : KaTeX
- **Icônes** : Lucide React
- **Utilitaires** : clsx, tailwind-merge, uuid
- **Déploiement** : Netlify

### Fichier principal : `src/App.tsx` (1122 lignes)

C'est le composant central qui gère **toute la navigation** via un state `step` de type `AppStep`:
```typescript
type AppStep = 'home' | 'login' | 'register' | 'userForm' | 'concoursSelection' | 'customExam' | 'quiz' | 'result' | 'correction';
```

L'état principal inclut : `theme`, `step`, `userInfo`, `selectedConcours`, `quizResult`, `concoursData`, `dataSource`, `accessCodeValidated`, etc.

### Architecture des données

**IMPORTANT — SÉCURITÉ** :
- Les **réponses correctes ne sont JAMAIS envoyées au frontend** en production
- La vue Supabase `questions_public` exclut le champ `correct_answers`
- Le score est calculé **côté serveur** via les fonctions RPC Supabase : `submit_quiz`, `submit_custom_exam`, `get_correction`
- En mode développement local, un fallback utilise `src/data/questions.ts`

### Structure des fichiers clés

```
src/
├── App.tsx              # Routeur SPA + logique principale
├── main.tsx             # Point d'entrée (AuthProvider > DataProvider > App)
├── config/
│   ├── supabase.ts      # Client Supabase + fonctions auth
│   ├── emailjs.ts       # Config EmailJS
│   ├── site.ts          # Modes (concours/examen/custom), thèmes, config
│   └── contact.ts       # Infos de contact
├── types/index.ts       # TOUS les types (Question, Concours, UserAnswer, QuizResult, etc.)
├── contexts/AuthContext.tsx  # Contexte auth React (useAuth hook)
├── providers/DataProvider.tsx # Chargement données Supabase/local
├── services/
│   ├── quizService.ts        # submitQuiz, getCorrection, submitCustomExam
│   ├── accessCodeService.ts  # verifyAccessCode, createAccessCode, listAccessCodes
│   ├── roctoringService.ts   # Proctoring anti-triche complet
│   ├── certificateService.ts # Génération PDF de certificats
│   ├── activityService.ts    # Historique tentatives (Supabase + localStorage)
│   └── notificationService.ts # Toasts + envoi email candidat
├── components/
│   ├── QuizPage.tsx          # Interface QCM (timer, navigation, soumission)
│   ├── ResultPage.tsx        # Résultats avec stats détaillées
│   ├── CorrectionPage.tsx    # Correction complète d'une soumission
│   ├── AdminDashboard.tsx    # Dashboard admin (Ctrl+Shift+A)
│   ├── AccessCodeModal.tsx   # Saisie du code d'accès
│   └── auth/                 # Login, Register, UserProfile
└── data/questions.ts         # Données locales de fallback (dev uniquement)
```

### Types importants (`src/types/index.ts`)

```typescript
// Un concours contient des catégories et des questions
interface Concours {
  id: string; name: string; description: string; icon: string;
  categories: CategoryConfig[];  // Matières avec nombre de questions
  questions: Question[];         // Questions du concours
  duration: number;              // En minutes
  available: boolean;
}

// Une question QCM
interface Question {
  id: number; category: Category; question: string;
  options: string[];             // Choix de réponse
  correctAnswers: number[];      // Index des bonnes réponses (JAMAIS au frontend en prod)
  hasLatex?: boolean;            // Contient des formules LaTeX
  image?: string;                // URL d'image optionnelle
}

// Résultat d'un quiz
interface QuizResult {
  user: UserInfo; concours: string; answers: UserAnswer[];
  score: number;                 // Score brut des réponses
  scoreFinal?: number;           // Score après pénalités proctoring
  totalQuestions: number;        // Nombre total de questions
  bonnesReponses: number; mauvaisesReponses: number; sansReponse: number;
  submissionId?: string;         // ID Supabase pour la correction
  proctoringData?: ProctoringData; // Données de surveillance
  isCustomExam?: boolean;
}
```

### Système de proctoring

Le proctoring (`roctoringService.ts`) détecte : changements d'onglet (-3pts), copier/coller (-1pt), outils de développement (-5pts), sortie plein écran (-2pts), clic droit (-1pt), etc. La pénalité totale est soustraite du score final.

### Système de codes d'accès

Deux types : **individuel** (1 code = 1 appareil) et **universel** (1 code = N utilisateurs). Gérés dans la table `access_codes` de Supabase. Le dashboard admin est accessible via **Ctrl+Shift+A** (mot de passe : `QCM_ADMIN_2024`).

### Certificats PDF

Générés avec jsPDF en format A4 paysage, avec bordure dorée, emblème du Burkina Faso, QR code de vérification, et mention (Excellent/Très Bien/Bien/Assez Bien/Passable). Éligibilité : score ≥ 50%.

### Tables Supabase principales

- `concours` : Liste des concours
- `categories` : Matières
- `concours_categories` : Liaison concours ↔ matières
- `questions` : Questions avec `correct_answers` (protégé)
- `questions_public` : Vue sécurisée (sans réponses)
- `submissions` : Soumissions des candidats
- `access_codes` : Codes d'accès
- `users` : Profils utilisateurs
- `quiz_attempts` : Historique des tentatives

### Règles à respecter

1. **Sécurité** : Ne JAMAIS exposer les `correct_answers` au frontend en production
2. **Navigation** : Ajouter de nouvelles pages via le système de `step` dans `App.tsx`
3. **Typage** : Tous les types sont dans `src/types/index.ts` — les étendre si nécessaire
4. **Services** : Créer un nouveau fichier dans `src/services/` pour toute logique métier
5. **Composants** : Créer dans `src/components/` et exporter dans `src/components/index.ts`
6. **Thèmes** : Respecter le système de thèmes (5 couleurs) dans le design
7. **Supabase** : Toute nouvelle table nécessite des politiques RLS (Row Level Security)
8. **Responsive** : Tout composant doit être responsive (mobile-first)
9. **Français** : Toute l'interface est en français
10. **Alias** : Utiliser `@/` pour les imports (alias vers `src/`)

### Comment ajouter une nouvelle fonctionnalité

1. **Analyser** les fichiers existants pour comprendre les patterns
2. **Définir les types** dans `src/types/index.ts`
3. **Créer le service** dans `src/services/` si nécessaire
4. **Créer le composant** dans `src/components/`
5. **Ajouter le step** dans `App.tsx` si c'est une nouvelle page
6. **Mettre à jour Supabase** (nouvelles tables, vues, RPC) si nécessaire
7. **Tester** en mode développement local (`npm run dev`)
