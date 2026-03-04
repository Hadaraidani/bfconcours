# QCM Concours Burkina Faso

Plateforme de preparation aux concours directs du Burkina Faso avec QCM en ligne.

![Version](https://img.shields.io/badge/version-1.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## Fonctionnalites

- **50 questions** reparties en 7 matieres
- **Questions a choix multiples** (certaines avec plusieurs bonnes reponses)
- **Support des images** dans les questions
- **Support des formules mathematiques** (LaTeX)
- **Timer** avec soumission automatique
- **Interface responsive** (mobile, tablette, desktop)
- **Generation d'examens personnalises** (max 25 questions)
- **5 themes de couleurs** personnalisables
- **Envoi automatique des resultats** par email (EmailJS)
- **Systeme de notation** : +1 (bonne), -1 (mauvaise), 0 (pas de reponse)
- **Page de correction detaillee** pour l'administrateur

## Matieres evaluees

| Matiere | Questions |
|---------|-----------|
| Francais | 8 |
| Mathematiques | 8 |
| Physique | 7 |
| SVT | 7 |
| Psychotechnique | 7 |
| Culture Generale | 7 |
| Histoire | 6 |

## Installation

```bash
# Cloner le projet
git clone https://github.com/votre-repo/qcm-concours-bf.git
cd qcm-concours-bf

# Installer les dependances
npm install

# Demarrer en mode developpement
npm run dev

# Construire pour la production
npm run build
```

## Configuration

### Configuration EmailJS

Modifiez `src/config/emailjs.ts` :

```typescript
export const EMAILJS_CONFIG = {
  serviceId: 'votre_service_id',
  templateId: 'votre_template_id',
  publicKey: 'votre_public_key',
  adminEmail: 'admin@example.com',
};
```

Voir [docs/EMAILJS_TEMPLATE_GUIDE.md](docs/EMAILJS_TEMPLATE_GUIDE.md) pour les instructions detaillees.

### Configuration du footer

Modifiez `src/config/contact.ts` pour personnaliser :
- Informations du createur
- Numero WhatsApp
- Page Facebook
- Email de contact
- Reseaux sociaux

### Configuration du site

Modifiez `src/config/site.ts` pour :
- Changer le theme par defaut
- Activer/desactiver le changement de theme
- Passer en mode "examen unique"
- Configurer le generateur personnalise

## Documentation

| Document | Description |
|----------|-------------|
| [GESTION_CONCOURS.md](docs/GESTION_CONCOURS.md) | Ajouter/modifier des concours et questions |
| [EMAILJS_TEMPLATE_GUIDE.md](docs/EMAILJS_TEMPLATE_GUIDE.md) | Configurer l'envoi d'emails |
| [GUIDE_CORRECTION_LOCALSTORAGE.md](docs/GUIDE_CORRECTION_LOCALSTORAGE.md) | Systeme de correction avec localStorage |
| [IMAGES_FORMULES.md](docs/IMAGES_FORMULES.md) | Ajouter des images et formules LaTeX |

## Systeme de correction

Le systeme utilise localStorage pour stocker les tentatives :

### Flux de fonctionnement

```
1. Candidat soumet le QCM
        |
        v
2. Score calcule (bonnes - mauvaises)
        |
        v
3. Donnees sauvegardees dans localStorage
        |
        v
4. attemptId unique genere : qcm_1705323456_abc123
        |
        v
5. URL de correction creee :
   https://monsite.com?attemptId=qcm_1705323456_abc123
        |
        v
6. Email envoye a l'admin avec :
   - Infos candidat
   - Score /50
   - Bouton "Voir correction"
        |
        v
7. Admin clique sur le lien
        |
        v
8. Page de correction affichee :
   - Infos candidat
   - Score et statistiques
   - Chaque question avec code couleur
```

### Code couleur de la correction

| Situation | Couleur | Signification |
|-----------|---------|---------------|
| Bonne reponse cochee | Vert fonce | Le candidat a trouve |
| Mauvaise reponse cochee | Rouge | Le candidat s'est trompe |
| Bonne reponse non cochee | Vert clair | Le candidat a oublie |

## Structure du projet

```
src/
  components/          # Composants React
    Header.tsx         # En-tete du site
    Footer.tsx         # Pied de page
    HeroBackground.tsx
    UserForm.tsx       # Formulaire d'identification
    ConcoursSelection.tsx
    CustomExamGenerator.tsx
    QuizPage.tsx       # Page du QCM
    ResultPage.tsx     # Page de resultats
    CorrectionPage.tsx # Page de correction admin
    MathRenderer.tsx   # Rendu des formules
  config/              # Fichiers de configuration
    emailjs.ts         # Configuration EmailJS
    contact.ts         # Informations de contact
    site.ts            # Configuration generale
  services/
    attemptService.ts  # Service de stockage des tentatives
  data/
    questions.ts       # Questions et concours
  types/
    index.ts           # Types TypeScript
  App.tsx              # Composant principal
  main.tsx             # Point d'entree
  index.css            # Styles globaux

public/
  images/              # Images pour les questions

docs/                  # Documentation
```

## Utilisation

1. **Page d'accueil** : L'utilisateur decouvre la plateforme
2. **Identification** : Saisie du nom, prenom et telephone
3. **Selection** : Choix du concours ou generation personnalisee
4. **QCM** : Reponse aux questions avec timer
5. **Resultats** : Confirmation d'envoi (score non affiche)
6. **Correction** : L'admin accede via le lien email

## Responsive Design

L'interface s'adapte automatiquement :
- **Mobile** : Navigation par onglets (Question / Feuille de reponses)
- **Tablette** : Affichage optimise
- **Desktop** : Vue side-by-side

## Securite

- Validation des entrees utilisateur (protection XSS)
- Les bonnes reponses ne sont jamais affichees au candidat
- Le score n'est pas affiche au candidat
- Envoi securise via EmailJS
- Sauvegarde locale en cas d'echec d'envoi

## Contribution

Les contributions sont les bienvenues ! N'hesitez pas a :
- Signaler des bugs
- Proposer des ameliorations
- Ajouter des questions

## License

MIT License - Voir [LICENSE](LICENSE) pour plus de details.

---

**Developpe pour le Burkina Faso**
