# Guide de Dépannage - Erreurs Courantes

## Erreur : "does not provide an export named 'QuestionImage'"

```
QuizPage.tsx:4 Uncaught SyntaxError: The requested module '/src/components/MathRenderer.tsx' 
does not provide an export named 'QuestionImage'
```

### Causes possibles

1. **Cache du navigateur** - Le navigateur utilise une ancienne version du fichier
2. **Cache de Vite** - Le serveur de développement garde en cache les anciens fichiers
3. **Fichier non synchronisé** - Le fichier MathRenderer.tsx n'a pas été correctement mis à jour

### Solutions

#### Solution 1 : Vider le cache et redémarrer

```bash
# 1. Arrêter le serveur de développement (Ctrl+C)

# 2. Supprimer les dossiers de cache
rm -rf node_modules/.vite
rm -rf dist

# 3. Redémarrer le serveur
npm run dev
```

#### Solution 2 : Forcer le rechargement du navigateur

1. Ouvrir les DevTools (F12)
2. Clic droit sur le bouton de rechargement
3. Sélectionner **"Vider le cache et effectuer un rechargement forcé"**

Ou :
- **Windows/Linux** : `Ctrl + Shift + R`
- **Mac** : `Cmd + Shift + R`

#### Solution 3 : Vérifier le fichier MathRenderer.tsx

Assurez-vous que le fichier `src/components/MathRenderer.tsx` contient bien ces deux exports :

```typescript
// Export 1 : MathRenderer
export function MathRenderer({ text, className = '' }: MathRendererProps) {
  // ... code
}

// Export 2 : QuestionImage  
export function QuestionImage({ src, alt, position }: QuestionImageProps) {
  // ... code
}
```

#### Solution 4 : Réinstaller les dépendances

```bash
# Supprimer node_modules et le cache
rm -rf node_modules
rm -rf package-lock.json
rm -rf node_modules/.vite

# Réinstaller
npm install

# Reconstruire
npm run build

# Redémarrer
npm run dev
```

#### Solution 5 : Vérifier l'import dans QuizPage.tsx

L'import doit être exactement :

```typescript
import { MathRenderer, QuestionImage } from './MathRenderer';
```

---

## Erreur : "Module not found: katex"

```
Module not found: Error: Can't resolve 'katex'
```

### Solution

```bash
npm install katex
```

---

## Erreur : "Invalid hook call"

```
Invalid hook call. Hooks can only be called inside of the body of a function component.
```

### Causes possibles

1. Versions incompatibles de React
2. Plusieurs instances de React

### Solution

```bash
npm ls react
# Vérifier qu'il n'y a qu'une seule version de React

# Si plusieurs versions :
rm -rf node_modules
rm -rf package-lock.json
npm install
```

---

## Erreur : Formules LaTeX ne s'affichent pas

### Symptômes

- Les formules apparaissent comme texte brut : `$x^2$`
- Ou erreur dans la console : `KaTeX error`

### Solutions

#### 1. Vérifier que KaTeX est installé

```bash
npm list katex
```

Si non installé :
```bash
npm install katex
```

#### 2. Vérifier l'import CSS de KaTeX

Dans `src/components/MathRenderer.tsx` :

```typescript
import 'katex/dist/katex.min.css';
```

Ou dans `src/index.css` :

```css
@import 'katex/dist/katex.min.css';
```

#### 3. Vérifier le format des formules

```typescript
// ✅ CORRECT - Double backslash
question: "Calculer $\\frac{1}{2}$"

// ❌ INCORRECT - Simple backslash
question: "Calculer $\frac{1}{2}$"
```

#### 4. Formules supportées

| Formule | Code |
|---------|------|
| Fraction | `$\\frac{a}{b}$` |
| Exposant | `$x^2$` |
| Indice | `$x_1$` |
| Racine | `$\\sqrt{x}$` |
| Limite | `$\\lim_{x \\to \\infty}$` |
| Intégrale | `$\\int_0^1 x \\, dx$` |
| Somme | `$\\sum_{k=1}^{n} k$` |
| Infini | `$\\infty$` |
| Flèche | `$\\to$ ou $\\rightarrow$` |

---

## Erreur : "Tentative introuvable" sur la page de correction

### Cause

Les données de correction sont encodées dans l'URL. Si l'URL est incomplète ou corrompue, les données ne peuvent pas être décodées.

### Solutions

#### 1. Vérifier l'URL complète

L'URL doit contenir le paramètre `data` :

```
https://monsite.com/?data=eyJpZCI6InFjbV8xNzA...
```

#### 2. Vérifier que l'email n'a pas tronqué l'URL

Certains clients email coupent les URLs longues. Solutions :
- Utiliser un raccourcisseur d'URL
- Envoyer l'email en HTML avec un lien cliquable

#### 3. Tester avec une nouvelle soumission

Passez un nouveau QCM et cliquez directement sur le lien dans l'email.

---

## Erreur de build : TypeScript

```
error TS2307: Cannot find module './MathRenderer'
```

### Solution

```bash
# Vérifier que le fichier existe
ls src/components/MathRenderer.tsx

# Reconstruire
npm run build
```

---

## Le site est lent / Long chargement

### Causes possibles

1. KaTeX charge beaucoup de polices
2. Trop de questions chargées en mémoire

### Solutions

#### 1. Vérifier la taille du bundle

```bash
npm run build
```

Regarder la taille dans la sortie. Si > 2MB, c'est normal avec KaTeX.

#### 2. Activer la compression sur le serveur

Si vous utilisez Nginx :

```nginx
gzip on;
gzip_types text/html application/javascript text/css;
```

---

## Commandes utiles

```bash
# Nettoyer et reconstruire complètement
rm -rf node_modules dist node_modules/.vite
npm install
npm run build

# Démarrer en mode développement
npm run dev

# Construire pour production
npm run build

# Prévisualiser le build de production
npm run preview
```

---

## Structure des fichiers importantes

```
src/
├── components/
│   ├── MathRenderer.tsx    # ← Rendu LaTeX et images
│   ├── QuizPage.tsx        # ← Page du QCM
│   ├── ResultPage.tsx      # ← Page de résultats
│   └── CorrectionPage.tsx  # ← Page de correction
├── data/
│   └── questions.ts        # ← Questions du QCM
├── services/
│   └── attemptService.ts   # ← Gestion des tentatives
└── index.css               # ← Styles globaux
```

---

## Contact support

Si le problème persiste, vérifiez :

1. La version de Node.js : `node --version` (recommandé : 18+)
2. La version de npm : `npm --version`
3. Les logs complets de l'erreur dans la console du navigateur (F12)
