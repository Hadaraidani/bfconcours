import { Question, Concours, Category, CategoryConfig } from '../types';

// ============================================================================
// LABELS DES CATÉGORIES (pour affichage)
// ============================================================================

export const categoryLabels: Partial<Record<Category, string>> = {
  francais: 'Français',
  maths: 'Mathématiques',
  physique: 'Physique',
  svt: 'SVT',
  chimie: 'Chimie',
  psychotechnique: 'Psychotechnique',
  culture: 'Culture Générale',
  histoire: 'Histoire',
  geographie: 'Géographie',
  droit_constitutionnel: 'Droit Constitutionnel',
  droit_administratif: 'Droit Administratif',
  droit_penal: 'Droit Pénal',
  droit_civil: 'Droit Civil',
  economie: 'Économie',
  comptabilite: 'Comptabilité',
  fiscalite: 'Fiscalité',
  informatique: 'Informatique',
  anglais: 'Anglais',
  philosophie: 'Philosophie',
  sport: 'Sport',
  pedagogie: 'Pédagogie',
  didactique: 'Didactique',
  psychologie: 'Psychologie',
  biologie: 'Biologie',
  anatomie: 'Anatomie',
  pharmacologie: 'Pharmacologie',
  soins_infirmiers: 'Soins Infirmiers',
  sante_publique: 'Santé Publique',
  secourisme: 'Secourisme',
  education_civique: 'Éducation Civique',
  logique: 'Logique',
  raisonnement: 'Raisonnement',
};

// Labels courts pour mobile
export const categoryLabelsShort: Partial<Record<Category, string>> = {
  francais: 'Fra',
  maths: 'Mat',
  physique: 'Phy',
  svt: 'SVT',
  chimie: 'Chi',
  psychotechnique: 'Psy',
  culture: 'Cul',
  histoire: 'His',
  geographie: 'Géo',
  droit_constitutionnel: 'D.Con',
  droit_administratif: 'D.Adm',
  droit_penal: 'D.Pén',
  droit_civil: 'D.Civ',
  economie: 'Éco',
  comptabilite: 'Cpt',
  fiscalite: 'Fis',
  informatique: 'Inf',
  anglais: 'Ang',
  philosophie: 'Phi',
  sport: 'Spo',
  pedagogie: 'Péd',
  didactique: 'Did',
  psychologie: 'Psy',
  biologie: 'Bio',
  anatomie: 'Ana',
  pharmacologie: 'Pha',
  soins_infirmiers: 'S.Inf',
  sante_publique: 'S.Pub',
  secourisme: 'Sec',
  education_civique: 'E.Civ',
  logique: 'Log',
  raisonnement: 'Rai',
};

// ============================================================================
// CONCOURS 1 : ENAM - Administration Générale (56 questions)
// Matières: Français, Droit Constitutionnel, Droit Administratif, Économie, 
//           Culture Générale, Histoire, Informatique
// ============================================================================

const enamCategories: CategoryConfig[] = [
  { id: 'francais', name: 'Français', questionsCount: 10 },
  { id: 'droit_constitutionnel', name: 'Droit Constitutionnel', questionsCount: 10 },
  { id: 'droit_administratif', name: 'Droit Administratif', questionsCount: 10 },
  { id: 'economie', name: 'Économie', questionsCount: 10 },
  { id: 'culture', name: 'Culture Générale', questionsCount: 8 },
  { id: 'histoire', name: 'Histoire', questionsCount: 5 },
  { id: 'informatique', name: 'Informatique', questionsCount: 3 },
];

const enamQuestions: Question[] = [
  // FRANÇAIS (10 questions)
  { id: 1, category: 'francais', question: "Quel est le pluriel du mot « cheval » ?", options: ["Chevals", "Chevaux", "Cheveux", "Chevales"], correctAnswers: [1] },
  { id: 2, category: 'francais', question: "Quelle est la nature du mot « rapidement » ?", options: ["Adjectif", "Adverbe", "Nom", "Verbe"], correctAnswers: [1] },
  { id: 3, category: 'francais', question: "Identifiez la phrase correctement orthographiée :", options: ["Les enfants que j'ai vu jouer", "Les enfants que j'ai vus jouer", "Les enfants que j'ai vues jouer", "Les enfants que j'ai vue jouer"], correctAnswers: [0] },
  { id: 4, category: 'francais', question: "Quel est le contraire de « prolixe » ?", options: ["Bavard", "Concis", "Verbeux", "Loquace"], correctAnswers: [1] },
  { id: 5, category: 'francais', question: "Dans la phrase « Il mange une pomme », quelle est la fonction de « une pomme » ?", options: ["Sujet", "COD", "COI", "Attribut"], correctAnswers: [1] },
  { id: 6, category: 'francais', question: "Quels mots sont des synonymes de « beau » ?", options: ["Joli", "Laid", "Magnifique", "Splendide", "Horrible", "Ravissant"], correctAnswers: [0, 2, 3, 5] },
  { id: 7, category: 'francais', question: "Quelle figure de style est utilisée dans « Cette faucille d'or dans le champ des étoiles » ?", options: ["Métaphore", "Comparaison", "Personnification", "Hyperbole"], correctAnswers: [0] },
  { id: 8, category: 'francais', question: "Conjuguez « finir » à la 3ème personne du pluriel au passé simple :", options: ["Ils finissent", "Ils finirent", "Ils finissèrent", "Ils finiront"], correctAnswers: [1] },
  { id: 9, category: 'francais', question: "Quel est le synonyme de « ubiquité » ?", options: ["Rareté", "Omniprésence", "Absence", "Unicité"], correctAnswers: [1] },
  { id: 10, category: 'francais', question: "Quelle est la bonne orthographe ?", options: ["Acceuil", "Accueil", "Acueil", "Accueuil"], correctAnswers: [1] },
  
  // DROIT CONSTITUTIONNEL (10 questions)
  { id: 11, category: 'droit_constitutionnel', question: "Quelle est la durée du mandat présidentiel au Burkina Faso selon la Constitution ?", options: ["4 ans", "5 ans", "6 ans", "7 ans"], correctAnswers: [1] },
  { id: 12, category: 'droit_constitutionnel', question: "Quel organe est chargé de veiller à la constitutionnalité des lois au Burkina Faso ?", options: ["La Cour de Cassation", "Le Conseil Constitutionnel", "Le Conseil d'État", "La Cour des Comptes"], correctAnswers: [1] },
  { id: 13, category: 'droit_constitutionnel', question: "Combien de députés compte l'Assemblée Nationale du Burkina Faso ?", options: ["111", "127", "143", "150"], correctAnswers: [1] },
  { id: 14, category: 'droit_constitutionnel', question: "Quel principe garantit la séparation des pouvoirs ?", options: ["Principe de légalité", "Principe de souveraineté", "Principe de séparation des pouvoirs", "Principe de subsidiarité"], correctAnswers: [2] },
  { id: 15, category: 'droit_constitutionnel', question: "Qui promulgue les lois au Burkina Faso ?", options: ["Le Premier Ministre", "Le Président de l'Assemblée", "Le Président du Faso", "Le Ministre de la Justice"], correctAnswers: [2] },
  { id: 16, category: 'droit_constitutionnel', question: "Quels sont les pouvoirs de l'État ? (Plusieurs réponses)", options: ["Pouvoir exécutif", "Pouvoir législatif", "Pouvoir judiciaire", "Pouvoir militaire", "Pouvoir économique"], correctAnswers: [0, 1, 2] },
  { id: 17, category: 'droit_constitutionnel', question: "La Constitution du Burkina Faso a été adoptée en quelle année ?", options: ["1991", "1997", "2000", "2015"], correctAnswers: [0] },
  { id: 18, category: 'droit_constitutionnel', question: "Quel article de la Constitution burkinabè traite des droits fondamentaux ?", options: ["Titre I", "Titre II", "Titre III", "Titre IV"], correctAnswers: [0] },
  { id: 19, category: 'droit_constitutionnel', question: "Qui peut proposer une révision de la Constitution ?", options: ["Le Président uniquement", "Les députés uniquement", "Le Président et les députés", "Le peuple uniquement"], correctAnswers: [2] },
  { id: 20, category: 'droit_constitutionnel', question: "Le référendum est une forme de :", options: ["Démocratie représentative", "Démocratie directe", "Monarchie constitutionnelle", "Oligarchie"], correctAnswers: [1] },
  
  // DROIT ADMINISTRATIF (10 questions)
  { id: 21, category: 'droit_administratif', question: "Quel est le juge de droit commun du contentieux administratif ?", options: ["Le tribunal de grande instance", "Le tribunal administratif", "La Cour de cassation", "Le Conseil d'État"], correctAnswers: [1] },
  { id: 22, category: 'droit_administratif', question: "Qu'est-ce qu'un acte administratif unilatéral ?", options: ["Un contrat entre l'État et un particulier", "Une décision prise par l'administration seule", "Un accord bilatéral", "Une loi votée par le Parlement"], correctAnswers: [1] },
  { id: 23, category: 'droit_administratif', question: "Le recours pour excès de pouvoir vise à :", options: ["Obtenir des dommages-intérêts", "Annuler un acte administratif illégal", "Modifier un contrat", "Révoquer un fonctionnaire"], correctAnswers: [1] },
  { id: 24, category: 'droit_administratif', question: "Qu'est-ce que le principe de légalité administrative ?", options: ["L'administration doit respecter la loi", "L'administration crée la loi", "L'administration est au-dessus de la loi", "L'administration interprète la loi"], correctAnswers: [0] },
  { id: 25, category: 'droit_administratif', question: "Un établissement public est :", options: ["Une entreprise privée", "Une personne morale de droit public", "Une association", "Une ONG"], correctAnswers: [1] },
  { id: 26, category: 'droit_administratif', question: "Quelles sont les collectivités territoriales au Burkina Faso ?", options: ["Les régions", "Les communes", "Les provinces", "Les départements", "Les villages"], correctAnswers: [0, 1] },
  { id: 27, category: 'droit_administratif', question: "Le délai de recours pour excès de pouvoir est de :", options: ["1 mois", "2 mois", "3 mois", "6 mois"], correctAnswers: [1] },
  { id: 28, category: 'droit_administratif', question: "Qu'est-ce qu'une autorité administrative indépendante ?", options: ["Un ministère", "Une institution indépendante du gouvernement", "Une entreprise publique", "Un tribunal"], correctAnswers: [1] },
  { id: 29, category: 'droit_administratif', question: "Le silence de l'administration vaut généralement :", options: ["Acceptation", "Rejet", "Cela dépend du contexte", "Annulation"], correctAnswers: [1] },
  { id: 30, category: 'droit_administratif', question: "Qui nomme les préfets au Burkina Faso ?", options: ["Le Premier Ministre", "Le Président du Faso", "Le Ministre de l'Intérieur", "L'Assemblée Nationale"], correctAnswers: [1] },
  
  // ÉCONOMIE (10 questions)
  { id: 31, category: 'economie', question: "Qu'est-ce que le PIB ?", options: ["Produit Intérieur Brut", "Production Industrielle de Base", "Profit International Bancaire", "Programme d'Investissement Budgétaire"], correctAnswers: [0] },
  { id: 32, category: 'economie', question: "L'inflation désigne :", options: ["Une baisse des prix", "Une hausse généralisée des prix", "Une stagnation économique", "Une augmentation du chômage"], correctAnswers: [1] },
  { id: 33, category: 'economie', question: "La BCEAO est la banque centrale de :", options: ["L'Afrique de l'Est", "L'Afrique de l'Ouest", "L'Afrique Centrale", "L'Afrique du Nord"], correctAnswers: [1] },
  { id: 34, category: 'economie', question: "Le FCFA signifie :", options: ["Franc de la Communauté Financière Africaine", "Franc Colonial Français d'Afrique", "Franc de la Coopération Franco-Africaine", "Franc des Colonies Françaises d'Afrique"], correctAnswers: [0] },
  { id: 35, category: 'economie', question: "Qu'est-ce que la balance commerciale ?", options: ["Différence entre importations et exportations", "Total des échanges commerciaux", "Solde du budget de l'État", "Réserves de change"], correctAnswers: [0] },
  { id: 36, category: 'economie', question: "Les facteurs de production sont : (Plusieurs réponses)", options: ["Le travail", "Le capital", "La terre", "L'impôt", "L'entrepreneuriat"], correctAnswers: [0, 1, 2, 4] },
  { id: 37, category: 'economie', question: "Qu'est-ce que l'UEMOA ?", options: ["Union Économique et Monétaire Ouest-Africaine", "Union des États Membres d'Afrique", "Organisation Économique de l'Afrique", "Alliance Monétaire Africaine"], correctAnswers: [0] },
  { id: 38, category: 'economie', question: "Le budget de l'État est voté par :", options: ["Le gouvernement", "Le Président", "L'Assemblée Nationale", "La Cour des Comptes"], correctAnswers: [2] },
  { id: 39, category: 'economie', question: "La TVA est un impôt :", options: ["Direct", "Indirect", "Progressif", "Dégressif"], correctAnswers: [1] },
  { id: 40, category: 'economie', question: "Qu'est-ce que le taux de chômage ?", options: ["Pourcentage de la population inactive", "Pourcentage des actifs sans emploi", "Nombre total de chômeurs", "Ratio emplois/population"], correctAnswers: [1] },
  
  // CULTURE GÉNÉRALE (8 questions)
  { id: 41, category: 'culture', question: "Quelle est la capitale du Burkina Faso ?", options: ["Bobo-Dioulasso", "Ouagadougou", "Banfora", "Koudougou"], correctAnswers: [1] },
  { id: 42, category: 'culture', question: "En quelle année le Burkina Faso a-t-il obtenu son indépendance ?", options: ["1958", "1960", "1962", "1963"], correctAnswers: [1] },
  { id: 43, category: 'culture', question: "Quels sont les pays limitrophes du Burkina Faso ?", options: ["Mali", "Nigeria", "Niger", "Côte d'Ivoire", "Sénégal", "Ghana"], correctAnswers: [0, 2, 3, 5] },
  { id: 44, category: 'culture', question: "Quel est le plus long fleuve d'Afrique ?", options: ["Le Congo", "Le Niger", "Le Nil", "Le Zambèze"], correctAnswers: [2] },
  { id: 45, category: 'culture', question: "Combien de régions compte le Burkina Faso ?", options: ["10", "13", "15", "17"], correctAnswers: [1] },
  { id: 46, category: 'culture', question: "Quelle est la devise du Burkina Faso ?", options: ["Unité, Travail, Justice", "Unité, Progrès, Justice", "Liberté, Égalité, Fraternité", "Paix, Travail, Patrie"], correctAnswers: [1] },
  { id: 47, category: 'culture', question: "Le FESPACO est un festival de :", options: ["Musique", "Cinéma", "Danse", "Théâtre"], correctAnswers: [1] },
  { id: 48, category: 'culture', question: "Quelle monnaie est utilisée au Burkina Faso ?", options: ["Le Cedi", "Le Naira", "Le Franc CFA", "Le Shilling"], correctAnswers: [2] },
  
  // HISTOIRE (5 questions)
  { id: 49, category: 'histoire', question: "Qui était le premier président du Burkina Faso (alors Haute-Volta) ?", options: ["Thomas Sankara", "Maurice Yaméogo", "Sangoulé Lamizana", "Blaise Compaoré"], correctAnswers: [1] },
  { id: 50, category: 'histoire', question: "En quelle année la Haute-Volta a-t-elle été renommée Burkina Faso ?", options: ["1980", "1984", "1987", "1990"], correctAnswers: [1] },
  { id: 51, category: 'histoire', question: "Thomas Sankara a dirigé le Burkina Faso de :", options: ["1980 à 1984", "1983 à 1987", "1984 à 1990", "1987 à 1991"], correctAnswers: [1] },
  { id: 52, category: 'histoire', question: "L'Empire Mossi était centré autour de quelle ville ?", options: ["Bobo-Dioulasso", "Ouagadougou", "Dori", "Banfora"], correctAnswers: [1] },
  { id: 53, category: 'histoire', question: "La colonisation française de la Haute-Volta a débuté vers :", options: ["1850", "1896", "1920", "1945"], correctAnswers: [1] },
  
  // INFORMATIQUE (3 questions)
  { id: 54, category: 'informatique', question: "Que signifie CPU ?", options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Unit"], correctAnswers: [0] },
  { id: 55, category: 'informatique', question: "Quel est le langage de balisage utilisé pour créer des pages web ?", options: ["Python", "HTML", "Java", "C++"], correctAnswers: [1] },
  { id: 56, category: 'informatique', question: "Qu'est-ce qu'un logiciel libre ?", options: ["Un logiciel gratuit uniquement", "Un logiciel dont le code source est accessible", "Un logiciel sans virus", "Un logiciel en ligne"], correctAnswers: [1] },
];

// ============================================================================
// CONCOURS 2 : ENAREF - Impôts et Domaines (44 questions)
// Matières: Français, Comptabilité, Fiscalité, Économie, Mathématiques, Droit
// ============================================================================

const enarefCategories: CategoryConfig[] = [
  { id: 'francais', name: 'Français', questionsCount: 8 },
  { id: 'comptabilite', name: 'Comptabilité', questionsCount: 10 },
  { id: 'fiscalite', name: 'Fiscalité', questionsCount: 10 },
  { id: 'economie', name: 'Économie', questionsCount: 8 },
  { id: 'maths', name: 'Mathématiques', questionsCount: 5 },
  { id: 'droit_civil', name: 'Droit Civil', questionsCount: 3 },
];

const enarefQuestions: Question[] = [
  // FRANÇAIS (8 questions) - Questions différentes de l'ENAM
  { id: 1, category: 'francais', question: "Quelle est la forme passive de « Le chat mange la souris » ?", options: ["La souris est mangée par le chat", "La souris mange le chat", "Le chat est mangé par la souris", "La souris a mangé le chat"], correctAnswers: [0] },
  { id: 2, category: 'francais', question: "Quel est le temps du verbe dans « Il aurait voulu partir » ?", options: ["Plus-que-parfait", "Conditionnel passé", "Futur antérieur", "Passé antérieur"], correctAnswers: [1] },
  { id: 3, category: 'francais', question: "Trouvez l'antonyme de « opulence » :", options: ["Richesse", "Pauvreté", "Abondance", "Prospérité"], correctAnswers: [1] },
  { id: 4, category: 'francais', question: "Quelle proposition contient une erreur d'accord ?", options: ["Les fleurs que j'ai cueillies", "La robe qu'elle a achetée", "Les livres que j'ai lu", "Les lettres que j'ai écrites"], correctAnswers: [2] },
  { id: 5, category: 'francais', question: "« Euphémisme » désigne :", options: ["Une exagération", "Une atténuation", "Une répétition", "Une comparaison"], correctAnswers: [1] },
  { id: 6, category: 'francais', question: "Quel mot est correctement orthographié ?", options: ["Dévellopement", "Développement", "Developpement", "Développpement"], correctAnswers: [1] },
  { id: 7, category: 'francais', question: "Dans « Elle parle couramment », « couramment » est :", options: ["Un adjectif", "Un adverbe de manière", "Un nom", "Une préposition"], correctAnswers: [1] },
  { id: 8, category: 'francais', question: "Le participe passé s'accorde avec le COD placé avant quand le verbe est conjugué avec :", options: ["Être", "Avoir", "Être et Avoir", "Aucun des deux"], correctAnswers: [1] },
  
  // COMPTABILITÉ (10 questions)
  { id: 9, category: 'comptabilite', question: "Quelle est l'équation comptable fondamentale ?", options: ["Actif = Passif", "Actif = Passif + Capitaux propres", "Actif + Passif = Capitaux", "Actif = Capitaux - Passif"], correctAnswers: [1] },
  { id: 10, category: 'comptabilite', question: "Le bilan est un document qui présente :", options: ["Les charges et les produits", "L'actif et le passif", "Les recettes et les dépenses", "Les créances uniquement"], correctAnswers: [1] },
  { id: 11, category: 'comptabilite', question: "Qu'est-ce qu'un compte de résultat ?", options: ["Un document qui retrace les flux de trésorerie", "Un document qui présente les charges et produits", "Un document qui liste les dettes", "Un document qui présente les immobilisations"], correctAnswers: [1] },
  { id: 12, category: 'comptabilite', question: "L'amortissement représente :", options: ["Une augmentation de valeur", "Une perte de valeur d'un actif", "Un gain exceptionnel", "Une dette à long terme"], correctAnswers: [1] },
  { id: 13, category: 'comptabilite', question: "Dans quel compte enregistre-t-on l'achat de marchandises ?", options: ["Compte 60", "Compte 70", "Compte 40", "Compte 21"], correctAnswers: [0] },
  { id: 14, category: 'comptabilite', question: "Le plan comptable OHADA est utilisé dans :", options: ["L'Union Européenne", "L'Afrique francophone", "L'Amérique du Nord", "L'Asie"], correctAnswers: [1] },
  { id: 15, category: 'comptabilite', question: "Une provision est :", options: ["Un gain certain", "Une charge probable", "Un actif immobilisé", "Un capital social"], correctAnswers: [1] },
  { id: 16, category: 'comptabilite', question: "Le journal comptable enregistre les opérations :", options: ["Par ordre alphabétique", "Par ordre chronologique", "Par ordre de montant", "Par ordre d'importance"], correctAnswers: [1] },
  { id: 17, category: 'comptabilite', question: "Quels sont les principes comptables fondamentaux ?", options: ["Prudence", "Continuité d'exploitation", "Indépendance des exercices", "Toutes ces réponses", "Aucune de ces réponses"], correctAnswers: [3] },
  { id: 18, category: 'comptabilite', question: "La TVA collectée est enregistrée au :", options: ["Débit", "Crédit", "Les deux", "Ni l'un ni l'autre"], correctAnswers: [1] },
  
  // FISCALITÉ (10 questions)
  { id: 19, category: 'fiscalite', question: "Qu'est-ce que l'impôt sur le revenu ?", options: ["Un impôt indirect", "Un impôt direct sur les revenus des personnes", "Une taxe sur la consommation", "Un droit de douane"], correctAnswers: [1] },
  { id: 20, category: 'fiscalite', question: "La TVA est calculée sur :", options: ["Le bénéfice", "Le chiffre d'affaires", "La valeur ajoutée", "Le capital"], correctAnswers: [2] },
  { id: 21, category: 'fiscalite', question: "Quel est le taux normal de TVA au Burkina Faso ?", options: ["15%", "18%", "20%", "25%"], correctAnswers: [1] },
  { id: 22, category: 'fiscalite', question: "L'impôt sur les sociétés (IS) frappe :", options: ["Les personnes physiques", "Les bénéfices des entreprises", "Les salaires", "Les successions"], correctAnswers: [1] },
  { id: 23, category: 'fiscalite', question: "Qu'est-ce que le fait générateur d'un impôt ?", options: ["Le paiement de l'impôt", "L'événement qui donne naissance à l'impôt", "La déclaration fiscale", "Le contrôle fiscal"], correctAnswers: [1] },
  { id: 24, category: 'fiscalite', question: "Les droits de douane sont des :", options: ["Impôts directs", "Impôts indirects", "Taxes parafiscales", "Cotisations sociales"], correctAnswers: [1] },
  { id: 25, category: 'fiscalite', question: "L'assiette fiscale désigne :", options: ["Le taux d'imposition", "La base de calcul de l'impôt", "Le montant de l'impôt", "La date de paiement"], correctAnswers: [1] },
  { id: 26, category: 'fiscalite', question: "Quels revenus sont imposables à l'IR ?", options: ["Salaires", "Revenus fonciers", "Bénéfices industriels", "Toutes ces réponses"], correctAnswers: [3] },
  { id: 27, category: 'fiscalite', question: "La retenue à la source est effectuée par :", options: ["Le contribuable", "Le tiers payeur (employeur)", "L'administration fiscale", "La banque"], correctAnswers: [1] },
  { id: 28, category: 'fiscalite', question: "Le contrôle fiscal peut être :", options: ["Sur pièces uniquement", "Sur place uniquement", "Sur pièces ou sur place", "Aucune de ces réponses"], correctAnswers: [2] },
  
  // ÉCONOMIE (8 questions) - Différentes de l'ENAM
  { id: 29, category: 'economie', question: "Qu'est-ce que la microéconomie ?", options: ["L'étude de l'économie nationale", "L'étude des comportements individuels", "L'étude des échanges internationaux", "L'étude de la monnaie"], correctAnswers: [1] },
  { id: 30, category: 'economie', question: "La loi de l'offre et de la demande détermine :", options: ["La quantité produite", "Le prix d'équilibre", "Le salaire minimum", "Le taux d'intérêt"], correctAnswers: [1] },
  { id: 31, category: 'economie', question: "Le monopole désigne :", options: ["Plusieurs vendeurs", "Un seul vendeur sur le marché", "Plusieurs acheteurs", "Un marché libre"], correctAnswers: [1] },
  { id: 32, category: 'economie', question: "Qu'est-ce que la déflation ?", options: ["Une hausse des prix", "Une baisse généralisée des prix", "Une hausse du chômage", "Une croissance économique"], correctAnswers: [1] },
  { id: 33, category: 'economie', question: "Le déficit budgétaire signifie que :", options: ["Les recettes dépassent les dépenses", "Les dépenses dépassent les recettes", "Le budget est équilibré", "Il n'y a pas de budget"], correctAnswers: [1] },
  { id: 34, category: 'economie', question: "Qu'est-ce que le taux directeur ?", options: ["Le taux de croissance", "Le taux d'intérêt fixé par la banque centrale", "Le taux de chômage", "Le taux de change"], correctAnswers: [1] },
  { id: 35, category: 'economie', question: "Les exportations contribuent à :", options: ["Augmenter le PIB", "Diminuer le PIB", "N'affectent pas le PIB", "Stabiliser le PIB"], correctAnswers: [0] },
  { id: 36, category: 'economie', question: "Le FMI est une institution de :", options: ["L'Union Africaine", "L'ONU", "Bretton Woods", "L'Union Européenne"], correctAnswers: [2] },
  
  // MATHÉMATIQUES (5 questions)
  { id: 37, category: 'maths', question: "Calculer : $15\\% \\times 200$", options: ["20", "25", "30", "35"], correctAnswers: [2], hasLatex: true },
  { id: 38, category: 'maths', question: "Si un article coûte 1000 FCFA et bénéficie d'une remise de 20%, quel est le prix final ?", options: ["800 FCFA", "900 FCFA", "850 FCFA", "750 FCFA"], correctAnswers: [0] },
  { id: 39, category: 'maths', question: "Résoudre : $\\frac{x}{4} = 25$", options: ["x = 100", "x = 75", "x = 50", "x = 125"], correctAnswers: [0], hasLatex: true },
  { id: 40, category: 'maths', question: "Un capital de 10 000 FCFA placé à 5% rapporte combien d'intérêt simple en 2 ans ?", options: ["500 FCFA", "1000 FCFA", "1500 FCFA", "2000 FCFA"], correctAnswers: [1] },
  { id: 41, category: 'maths', question: "Calculer la moyenne de : 12, 15, 18, 20, 25", options: ["17", "18", "19", "20"], correctAnswers: [1] },
  
  // DROIT CIVIL (3 questions)
  { id: 42, category: 'droit_civil', question: "L'âge de la majorité civile au Burkina Faso est de :", options: ["16 ans", "18 ans", "20 ans", "21 ans"], correctAnswers: [1] },
  { id: 43, category: 'droit_civil', question: "Un contrat est valable si :", options: ["Il y a consentement des parties", "L'objet est licite", "La cause est licite", "Toutes ces conditions sont réunies"], correctAnswers: [3] },
  { id: 44, category: 'droit_civil', question: "La prescription en matière civile est généralement de :", options: ["5 ans", "10 ans", "20 ans", "30 ans"], correctAnswers: [3] },
];

// ============================================================================
// CONCOURS 3 : ENSP - Police Nationale (50 questions)
// Matières: Français, Droit Pénal, Culture Générale, Sport, Psychotechnique
// ============================================================================

const enspCategories: CategoryConfig[] = [
  { id: 'francais', name: 'Français', questionsCount: 10 },
  { id: 'droit_penal', name: 'Droit Pénal', questionsCount: 12 },
  { id: 'culture', name: 'Culture Générale', questionsCount: 12 },
  { id: 'sport', name: 'Sport', questionsCount: 6 },
  { id: 'psychotechnique', name: 'Psychotechnique', questionsCount: 10 },
];

const enspQuestions: Question[] = [
  // FRANÇAIS (10 questions) - Questions spécifiques police
  { id: 1, category: 'francais', question: "Quel est le sens du mot « procès-verbal » ?", options: ["Un jugement", "Un document officiel constatant des faits", "Une plaidoirie", "Un témoignage"], correctAnswers: [1] },
  { id: 2, category: 'francais', question: "Orthographiez correctement :", options: ["Interpèlation", "Interpellation", "Interpelation", "Interpéllation"], correctAnswers: [1] },
  { id: 3, category: 'francais', question: "« Flagrant délit » signifie :", options: ["Délit ancien", "Délit commis sous les yeux d'un témoin", "Délit mineur", "Délit intentionnel"], correctAnswers: [1] },
  { id: 4, category: 'francais', question: "Quel est le synonyme de « réquisitoire » ?", options: ["Défense", "Accusation", "Témoignage", "Verdict"], correctAnswers: [1] },
  { id: 5, category: 'francais', question: "La voix passive de « La police arrête le suspect » est :", options: ["Le suspect est arrêté par la police", "La police a arrêté le suspect", "Le suspect arrête la police", "On arrête le suspect"], correctAnswers: [0] },
  { id: 6, category: 'francais', question: "Complétez : « Il a été _____ pour vol. »", options: ["inculper", "inculpé", "inculpait", "inculpant"], correctAnswers: [1] },
  { id: 7, category: 'francais', question: "Quel mot désigne une personne soupçonnée d'un crime ?", options: ["Témoin", "Victime", "Suspect", "Juge"], correctAnswers: [2] },
  { id: 8, category: 'francais', question: "« Homicide » désigne :", options: ["Un vol", "Le meurtre d'un être humain", "Une agression", "Une fraude"], correctAnswers: [1] },
  { id: 9, category: 'francais', question: "Quel est l'antonyme de « coupable » ?", options: ["Accusé", "Innocent", "Suspect", "Complice"], correctAnswers: [1] },
  { id: 10, category: 'francais', question: "Un « alibi » est :", options: ["Une preuve de culpabilité", "Une preuve d'absence du lieu du crime", "Un témoignage", "Un aveu"], correctAnswers: [1] },
  
  // DROIT PÉNAL (12 questions)
  { id: 11, category: 'droit_penal', question: "Qu'est-ce qu'un crime ?", options: ["Une infraction mineure", "L'infraction la plus grave", "Une contravention", "Un délit mineur"], correctAnswers: [1] },
  { id: 12, category: 'droit_penal', question: "Les trois catégories d'infractions sont :", options: ["Crimes, délits, contraventions", "Crimes, fautes, erreurs", "Délits, fautes, infractions", "Crimes, péchés, fautes"], correctAnswers: [0] },
  { id: 13, category: 'droit_penal', question: "La garde à vue ne peut excéder initialement :", options: ["24 heures", "48 heures", "72 heures", "96 heures"], correctAnswers: [1] },
  { id: 14, category: 'droit_penal', question: "Qu'est-ce que la présomption d'innocence ?", options: ["On est coupable jusqu'à preuve du contraire", "On est innocent jusqu'à preuve du contraire", "On est toujours coupable", "On est toujours innocent"], correctAnswers: [1] },
  { id: 15, category: 'droit_penal', question: "La légitime défense permet de :", options: ["Attaquer librement", "Se défendre proportionnellement à l'attaque", "Fuir systématiquement", "Appeler uniquement la police"], correctAnswers: [1] },
  { id: 16, category: 'droit_penal', question: "Qui dirige l'enquête préliminaire ?", options: ["Le juge d'instruction", "Le procureur de la République", "Le préfet", "Le maire"], correctAnswers: [1] },
  { id: 17, category: 'droit_penal', question: "La récidive entraîne :", options: ["Une diminution de peine", "Une aggravation de peine", "Aucun changement", "Une amnistie"], correctAnswers: [1] },
  { id: 18, category: 'droit_penal', question: "L'élément moral d'une infraction désigne :", options: ["Le préjudice causé", "L'intention de commettre l'acte", "Le lieu du crime", "La victime"], correctAnswers: [1] },
  { id: 19, category: 'droit_penal', question: "Qu'est-ce que la complicité ?", options: ["Participation directe au crime", "Aide à la commission d'une infraction", "Témoignage", "Dénonciation"], correctAnswers: [1] },
  { id: 20, category: 'droit_penal', question: "La prescription pour un crime est de :", options: ["3 ans", "6 ans", "10 ans", "20 ans"], correctAnswers: [2] },
  { id: 21, category: 'droit_penal', question: "Quels sont les éléments constitutifs d'une infraction ?", options: ["Élément légal", "Élément matériel", "Élément moral", "Tous ces éléments"], correctAnswers: [3] },
  { id: 22, category: 'droit_penal', question: "Le vol avec violence est qualifié de :", options: ["Vol simple", "Vol aggravé", "Escroquerie", "Abus de confiance"], correctAnswers: [1] },
  
  // CULTURE GÉNÉRALE (12 questions)
  { id: 23, category: 'culture', question: "Quelle est la capitale du Burkina Faso ?", options: ["Bobo-Dioulasso", "Ouagadougou", "Banfora", "Koudougou"], correctAnswers: [1] },
  { id: 24, category: 'culture', question: "En quelle année le Burkina Faso a-t-il obtenu son indépendance ?", options: ["1958", "1960", "1962", "1963"], correctAnswers: [1] },
  { id: 25, category: 'culture', question: "Qui est le fondateur de la Police Nationale du Burkina Faso ?", options: ["Thomas Sankara", "Maurice Yaméogo", "Sangoulé Lamizana", "L'administration coloniale"], correctAnswers: [3] },
  { id: 26, category: 'culture', question: "Quel est le numéro d'urgence de la police au Burkina Faso ?", options: ["15", "17", "18", "112"], correctAnswers: [1] },
  { id: 27, category: 'culture', question: "Combien de régions compte le Burkina Faso ?", options: ["10", "13", "15", "17"], correctAnswers: [1] },
  { id: 28, category: 'culture', question: "Le maintien de l'ordre public est assuré par :", options: ["L'armée uniquement", "La police et la gendarmerie", "Les citoyens", "Les maires"], correctAnswers: [1] },
  { id: 29, category: 'culture', question: "Quelle organisation internationale lutte contre la criminalité transfrontalière ?", options: ["ONU", "INTERPOL", "UNESCO", "OMS"], correctAnswers: [1] },
  { id: 30, category: 'culture', question: "La Police Nationale est placée sous la tutelle de quel ministère ?", options: ["Ministère de la Défense", "Ministère de la Sécurité", "Ministère de la Justice", "Ministère de l'Intérieur"], correctAnswers: [1] },
  { id: 31, category: 'culture', question: "Le FESPACO est un festival de :", options: ["Musique", "Cinéma", "Danse", "Théâtre"], correctAnswers: [1] },
  { id: 32, category: 'culture', question: "Quelle est la deuxième ville du Burkina Faso ?", options: ["Koudougou", "Bobo-Dioulasso", "Ouahigouya", "Banfora"], correctAnswers: [1] },
  { id: 33, category: 'culture', question: "Les couleurs du drapeau burkinabè sont :", options: ["Vert, jaune, rouge", "Rouge, vert avec étoile jaune", "Vert, blanc, rouge", "Bleu, blanc, rouge"], correctAnswers: [1] },
  { id: 34, category: 'culture', question: "L'hymne national du Burkina Faso est :", options: ["La Marseillaise", "Une Seule Nuit", "Le Ditanyè", "L'Abidjanaise"], correctAnswers: [2] },
  
  // SPORT (6 questions)
  { id: 35, category: 'sport', question: "Quelle est la distance d'un marathon ?", options: ["21 km", "42,195 km", "10 km", "50 km"], correctAnswers: [1] },
  { id: 36, category: 'sport', question: "Combien de joueurs composent une équipe de football sur le terrain ?", options: ["9", "10", "11", "12"], correctAnswers: [2] },
  { id: 37, category: 'sport', question: "Les épreuves d'admission à la police incluent :", options: ["Course de vitesse", "Course d'endurance", "Pompes", "Toutes ces épreuves"], correctAnswers: [3] },
  { id: 38, category: 'sport', question: "Le fair-play en sport signifie :", options: ["Gagner à tout prix", "Respect des règles et de l'adversaire", "Tricher intelligemment", "Abandonner facilement"], correctAnswers: [1] },
  { id: 39, category: 'sport', question: "Quel sport est le plus populaire au Burkina Faso ?", options: ["Basketball", "Football", "Handball", "Athlétisme"], correctAnswers: [1] },
  { id: 40, category: 'sport', question: "L'échauffement avant l'effort physique permet de :", options: ["Perdre du temps", "Préparer le corps à l'effort", "Fatiguer le corps", "Rien de particulier"], correctAnswers: [1] },
  
  // PSYCHOTECHNIQUE (10 questions)
  { id: 41, category: 'psychotechnique', question: "Complétez la suite : 2, 4, 8, 16, ...", options: ["24", "32", "30", "28"], correctAnswers: [1] },
  { id: 42, category: 'psychotechnique', question: "Trouvez l'intrus : chaise, table, lit, voiture", options: ["Chaise", "Table", "Lit", "Voiture"], correctAnswers: [3] },
  { id: 43, category: 'psychotechnique', question: "Si POLICE = 6 lettres, GENDARMERIE = ?", options: ["10", "11", "12", "9"], correctAnswers: [1] },
  { id: 44, category: 'psychotechnique', question: "Pierre est plus rapide que Jean. Marie est plus lente que Jean. Qui est le plus rapide ?", options: ["Pierre", "Jean", "Marie", "Impossible à dire"], correctAnswers: [0] },
  { id: 45, category: 'psychotechnique', question: "Quel nombre complète la série : 3, 6, 9, 12, ?", options: ["13", "14", "15", "16"], correctAnswers: [2] },
  { id: 46, category: 'psychotechnique', question: "Un policier travaille 8h par jour. Combien d'heures en 5 jours ?", options: ["35h", "40h", "45h", "50h"], correctAnswers: [1] },
  { id: 47, category: 'psychotechnique', question: "Quel est le prochain terme : A, C, E, G, ?", options: ["H", "I", "J", "K"], correctAnswers: [1] },
  { id: 48, category: 'psychotechnique', question: "Si tous les policiers sont courageux et Jean est policier, alors :", options: ["Jean n'est pas courageux", "Jean est courageux", "Jean est peut-être courageux", "On ne peut pas savoir"], correctAnswers: [1] },
  { id: 49, category: 'psychotechnique', question: "Combien y a-t-il de triangles dans un hexagone divisé depuis son centre ?", options: ["4", "5", "6", "7"], correctAnswers: [2] },
  { id: 50, category: 'psychotechnique', question: "À quelle heure sera-t-il dans 3h30 s'il est 14h45 ?", options: ["17h15", "18h15", "17h45", "18h45"], correctAnswers: [1] },
];

// ============================================================================
// CONCOURS 4 : SANTÉ - Infirmiers d'État (45 questions)
// Matières: Français, Biologie, Anatomie, Soins Infirmiers, Pharmacologie
// ============================================================================

const santeCategories: CategoryConfig[] = [
  { id: 'francais', name: 'Français', questionsCount: 8 },
  { id: 'biologie', name: 'Biologie', questionsCount: 12 },
  { id: 'anatomie', name: 'Anatomie', questionsCount: 10 },
  { id: 'soins_infirmiers', name: 'Soins Infirmiers', questionsCount: 10 },
  { id: 'pharmacologie', name: 'Pharmacologie', questionsCount: 5 },
];

const santeQuestions: Question[] = [
  // FRANÇAIS (8 questions)
  { id: 1, category: 'francais', question: "Quel est le sens du mot « diagnostic » ?", options: ["Traitement", "Identification d'une maladie", "Prévention", "Guérison"], correctAnswers: [1] },
  { id: 2, category: 'francais', question: "Orthographiez correctement :", options: ["Hémoragie", "Hémorragie", "Hémmoragie", "Hémorrage"], correctAnswers: [1] },
  { id: 3, category: 'francais', question: "« Pronostic » désigne :", options: ["Le traitement", "La prévision de l'évolution d'une maladie", "Le diagnostic", "L'origine de la maladie"], correctAnswers: [1] },
  { id: 4, category: 'francais', question: "Quel est le synonyme de « pathologie » ?", options: ["Santé", "Maladie", "Traitement", "Prévention"], correctAnswers: [1] },
  { id: 5, category: 'francais', question: "Complétez : « Le patient souffre d'une _____ cardiaque. »", options: ["insuffisant", "insuffisance", "insuffisantes", "insuffisants"], correctAnswers: [1] },
  { id: 6, category: 'francais', question: "Quel mot désigne l'étude des médicaments ?", options: ["Pathologie", "Pharmacologie", "Biologie", "Anatomie"], correctAnswers: [1] },
  { id: 7, category: 'francais', question: "« Asymptomatique » signifie :", options: ["Avec symptômes", "Sans symptômes", "Symptômes graves", "Symptômes légers"], correctAnswers: [1] },
  { id: 8, category: 'francais', question: "L'antonyme de « chronique » est :", options: ["Permanent", "Aigu", "Durable", "Persistant"], correctAnswers: [1] },
  
  // BIOLOGIE (12 questions)
  { id: 9, category: 'biologie', question: "Quel organe produit l'insuline ?", options: ["Le foie", "Le pancréas", "Les reins", "L'estomac"], correctAnswers: [1] },
  { id: 10, category: 'biologie', question: "Quels sont les constituants de l'ADN ?", options: ["Adénine", "Thymine", "Cytosine", "Guanine", "Glucose"], correctAnswers: [0, 1, 2, 3] },
  { id: 11, category: 'biologie', question: "La photosynthèse se déroule dans :", options: ["Les mitochondries", "Les chloroplastes", "Le noyau", "Les ribosomes"], correctAnswers: [1] },
  { id: 12, category: 'biologie', question: "Quel est le groupe sanguin donneur universel ?", options: ["A+", "B+", "AB+", "O-"], correctAnswers: [3] },
  { id: 13, category: 'biologie', question: "Combien de chromosomes possède une cellule humaine normale ?", options: ["23", "46", "48", "44"], correctAnswers: [1] },
  { id: 14, category: 'biologie', question: "Les globules rouges transportent :", options: ["Les anticorps", "L'oxygène", "Les nutriments", "Les hormones"], correctAnswers: [1] },
  { id: 15, category: 'biologie', question: "La mitose permet :", options: ["La reproduction sexuée", "La division cellulaire", "La respiration", "La digestion"], correctAnswers: [1] },
  { id: 16, category: 'biologie', question: "Les enzymes sont des :", options: ["Glucides", "Lipides", "Protéines", "Vitamines"], correctAnswers: [2] },
  { id: 17, category: 'biologie', question: "Le plasma sanguin contient principalement :", options: ["Des globules", "De l'eau", "Des os", "Des muscles"], correctAnswers: [1] },
  { id: 18, category: 'biologie', question: "Les bactéries sont des organismes :", options: ["Eucaryotes", "Procaryotes", "Pluricellulaires", "Végétaux"], correctAnswers: [1] },
  { id: 19, category: 'biologie', question: "La vaccination permet de :", options: ["Guérir une maladie", "Prévenir une maladie", "Diagnostiquer une maladie", "Transmettre une maladie"], correctAnswers: [1] },
  { id: 20, category: 'biologie', question: "L'hémoglobine se trouve dans :", options: ["Les globules blancs", "Les globules rouges", "Les plaquettes", "Le plasma"], correctAnswers: [1] },
  
  // ANATOMIE (10 questions)
  { id: 21, category: 'anatomie', question: "Combien d'os compte le corps humain adulte ?", options: ["186", "206", "226", "256"], correctAnswers: [1] },
  { id: 22, category: 'anatomie', question: "Le cœur comporte combien de cavités ?", options: ["2", "3", "4", "5"], correctAnswers: [2] },
  { id: 23, category: 'anatomie', question: "Quel organe filtre le sang ?", options: ["Le foie", "Les reins", "Les poumons", "L'estomac"], correctAnswers: [1] },
  { id: 24, category: 'anatomie', question: "Les poumons se trouvent dans :", options: ["La cavité abdominale", "La cavité thoracique", "La cavité pelvienne", "La cavité crânienne"], correctAnswers: [1] },
  { id: 25, category: 'anatomie', question: "Le plus grand os du corps humain est :", options: ["L'humérus", "Le tibia", "Le fémur", "Le péroné"], correctAnswers: [2] },
  { id: 26, category: 'anatomie', question: "Le système nerveux central comprend :", options: ["Le cerveau et la moelle épinière", "Les nerfs périphériques", "Les muscles", "Les os"], correctAnswers: [0] },
  { id: 27, category: 'anatomie', question: "La trachée conduit l'air vers :", options: ["L'estomac", "Le cœur", "Les poumons", "Les reins"], correctAnswers: [2] },
  { id: 28, category: 'anatomie', question: "Le foie est situé dans :", options: ["Le thorax", "L'abdomen supérieur droit", "Le bassin", "Le dos"], correctAnswers: [1] },
  { id: 29, category: 'anatomie', question: "Les artères transportent le sang :", options: ["Vers le cœur", "Du cœur vers les organes", "Entre les organes", "Dans les os"], correctAnswers: [1] },
  { id: 30, category: 'anatomie', question: "La colonne vertébrale comporte combien de vertèbres ?", options: ["26", "30", "33", "36"], correctAnswers: [2] },
  
  // SOINS INFIRMIERS (10 questions)
  { id: 31, category: 'soins_infirmiers', question: "La température corporelle normale est d'environ :", options: ["35°C", "37°C", "39°C", "40°C"], correctAnswers: [1] },
  { id: 32, category: 'soins_infirmiers', question: "La tension artérielle normale chez l'adulte est environ :", options: ["100/60 mmHg", "120/80 mmHg", "140/100 mmHg", "160/110 mmHg"], correctAnswers: [1] },
  { id: 33, category: 'soins_infirmiers', question: "L'asepsie désigne :", options: ["La présence de germes", "L'absence de germes", "Le nettoyage simple", "La désinfection partielle"], correctAnswers: [1] },
  { id: 34, category: 'soins_infirmiers', question: "La position latérale de sécurité (PLS) est utilisée pour :", options: ["Les fractures", "Les personnes inconscientes", "Les brûlures", "Les hémorragies"], correctAnswers: [1] },
  { id: 35, category: 'soins_infirmiers', question: "Une injection intramusculaire se fait dans :", options: ["La veine", "Le muscle", "Sous la peau", "L'articulation"], correctAnswers: [1] },
  { id: 36, category: 'soins_infirmiers', question: "Le lavage des mains est important pour :", options: ["L'esthétique", "Prévenir les infections", "Le confort", "La réglementation uniquement"], correctAnswers: [1] },
  { id: 37, category: 'soins_infirmiers', question: "Un pansement occlusif est :", options: ["Aéré", "Étanche", "Transparent", "Humide"], correctAnswers: [1] },
  { id: 38, category: 'soins_infirmiers', question: "La fréquence cardiaque normale au repos est :", options: ["40-60 bpm", "60-100 bpm", "100-120 bpm", "120-140 bpm"], correctAnswers: [1] },
  { id: 39, category: 'soins_infirmiers', question: "La glycémie à jeun normale est d'environ :", options: ["0,5-0,7 g/L", "0,7-1,1 g/L", "1,2-1,5 g/L", "1,5-2,0 g/L"], correctAnswers: [1] },
  { id: 40, category: 'soins_infirmiers', question: "Un patient déshydraté présente :", options: ["Une peau moite", "Une peau sèche et des muqueuses sèches", "Une transpiration excessive", "Une peau froide"], correctAnswers: [1] },
  
  // PHARMACOLOGIE (5 questions)
  { id: 41, category: 'pharmacologie', question: "Le paracétamol est utilisé comme :", options: ["Antibiotique", "Antalgique et antipyrétique", "Anti-inflammatoire stéroïdien", "Anticoagulant"], correctAnswers: [1] },
  { id: 42, category: 'pharmacologie', question: "Les antibiotiques agissent sur :", options: ["Les virus", "Les bactéries", "Les champignons", "Les parasites uniquement"], correctAnswers: [1] },
  { id: 43, category: 'pharmacologie', question: "La voie d'administration la plus rapide est :", options: ["Orale", "Intraveineuse", "Sous-cutanée", "Rectale"], correctAnswers: [1] },
  { id: 44, category: 'pharmacologie', question: "Un effet secondaire est :", options: ["L'effet principal recherché", "Un effet indésirable du médicament", "L'absence d'effet", "Une allergie systématique"], correctAnswers: [1] },
  { id: 45, category: 'pharmacologie', question: "L'insuline est utilisée pour traiter :", options: ["L'hypertension", "Le diabète", "L'asthme", "L'épilepsie"], correctAnswers: [1] },
];

// ============================================================================
// CONCOURS 5 : ENSEP - Éducation Physique (40 questions)
// Matières: Français, Pédagogie, Sport, Psychologie, Biologie
// ============================================================================

const ensepCategories: CategoryConfig[] = [
  { id: 'francais', name: 'Français', questionsCount: 8 },
  { id: 'pedagogie', name: 'Pédagogie', questionsCount: 10 },
  { id: 'sport', name: 'Sport', questionsCount: 10 },
  { id: 'psychologie', name: 'Psychologie', questionsCount: 7 },
  { id: 'biologie', name: 'Biologie', questionsCount: 5 },
];

const ensepQuestions: Question[] = [
  // FRANÇAIS (8 questions)
  { id: 1, category: 'francais', question: "Quel est le sens du mot « pédagogie » ?", options: ["Art de soigner", "Art d'enseigner", "Art de gouverner", "Art de construire"], correctAnswers: [1] },
  { id: 2, category: 'francais', question: "Orthographiez correctement :", options: ["Éducation fizique", "Éducation physique", "Education physique", "Éducation phisique"], correctAnswers: [1] },
  { id: 3, category: 'francais', question: "« Didactique » désigne :", options: ["L'art d'enseigner une discipline", "L'art de courir", "L'art de jouer", "L'art de manger"], correctAnswers: [0] },
  { id: 4, category: 'francais', question: "Quel est le synonyme de « aptitude » ?", options: ["Inaptitude", "Capacité", "Incapacité", "Faiblesse"], correctAnswers: [1] },
  { id: 5, category: 'francais', question: "Complétez : « L'entraîneur _____ ses athlètes. »", options: ["entraîne", "entraînent", "entraînes", "entraînons"], correctAnswers: [0] },
  { id: 6, category: 'francais', question: "« Endurance » signifie :", options: ["Vitesse maximale", "Capacité à résister à la fatigue", "Force musculaire", "Souplesse"], correctAnswers: [1] },
  { id: 7, category: 'francais', question: "L'antonyme de « performance » est :", options: ["Succès", "Échec", "Victoire", "Record"], correctAnswers: [1] },
  { id: 8, category: 'francais', question: "Quel mot désigne un exercice d'échauffement ?", options: ["Récupération", "Préparation", "Compétition", "Finale"], correctAnswers: [1] },
  
  // PÉDAGOGIE (10 questions)
  { id: 9, category: 'pedagogie', question: "L'objectif pédagogique doit être :", options: ["Vague", "Mesurable et observable", "Implicite", "Subjectif"], correctAnswers: [1] },
  { id: 10, category: 'pedagogie', question: "La méthode active place au centre :", options: ["L'enseignant", "L'apprenant", "Le programme", "L'administration"], correctAnswers: [1] },
  { id: 11, category: 'pedagogie', question: "L'évaluation formative sert à :", options: ["Classer les élèves", "Réguler l'apprentissage", "Sanctionner", "Éliminer"], correctAnswers: [1] },
  { id: 12, category: 'pedagogie', question: "Un feedback est :", options: ["Une punition", "Un retour d'information", "Une récompense", "Un examen"], correctAnswers: [1] },
  { id: 13, category: 'pedagogie', question: "La différenciation pédagogique consiste à :", options: ["Traiter tous les élèves de la même manière", "Adapter l'enseignement aux besoins de chacun", "Séparer les bons des mauvais élèves", "Ignorer les différences"], correctAnswers: [1] },
  { id: 14, category: 'pedagogie', question: "La motivation intrinsèque vient de :", options: ["L'extérieur (récompenses)", "L'intérieur de l'individu", "L'enseignant", "Les parents"], correctAnswers: [1] },
  { id: 15, category: 'pedagogie', question: "Une situation d'apprentissage doit être :", options: ["Impossible", "Adaptée au niveau des apprenants", "Trop facile", "Sans objectif"], correctAnswers: [1] },
  { id: 16, category: 'pedagogie', question: "La progression pédagogique va :", options: ["Du complexe au simple", "Du simple au complexe", "Au hasard", "Du difficile au facile"], correctAnswers: [1] },
  { id: 17, category: 'pedagogie', question: "L'observation en EPS permet de :", options: ["Punir les élèves", "Évaluer et corriger les gestes", "Ignorer les erreurs", "Favoriser certains élèves"], correctAnswers: [1] },
  { id: 18, category: 'pedagogie', question: "Un cycle d'apprentissage en EPS dure généralement :", options: ["1 séance", "Plusieurs séances", "1 an", "5 minutes"], correctAnswers: [1] },
  
  // SPORT (10 questions)
  { id: 19, category: 'sport', question: "Quelle est la distance d'un marathon ?", options: ["21,1 km", "42,195 km", "10 km", "50 km"], correctAnswers: [1] },
  { id: 20, category: 'sport', question: "Combien de joueurs composent une équipe de basketball sur le terrain ?", options: ["4", "5", "6", "7"], correctAnswers: [1] },
  { id: 21, category: 'sport', question: "Le sprint sollicite principalement :", options: ["L'endurance", "La vitesse et la puissance", "La souplesse", "L'équilibre uniquement"], correctAnswers: [1] },
  { id: 22, category: 'sport', question: "La récupération après l'effort est importante pour :", options: ["Éviter les blessures et progresser", "Perdre du temps", "Rien de particulier", "Faire plaisir"], correctAnswers: [0] },
  { id: 23, category: 'sport', question: "Le dopage est :", options: ["Autorisé", "Interdit", "Recommandé", "Obligatoire"], correctAnswers: [1] },
  { id: 24, category: 'sport', question: "Les qualités physiques de base sont :", options: ["Force, vitesse, endurance, souplesse", "Taille, poids, âge", "Intelligence, mémoire", "Vue, ouïe, toucher"], correctAnswers: [0] },
  { id: 25, category: 'sport', question: "L'échauffement dure généralement :", options: ["30 secondes", "10-15 minutes", "1 heure", "5 secondes"], correctAnswers: [1] },
  { id: 26, category: 'sport', question: "En athlétisme, le relais 4x100m implique :", options: ["4 coureurs de 100m chacun", "1 coureur de 400m", "4 coureurs de 400m", "2 coureurs"], correctAnswers: [0] },
  { id: 27, category: 'sport', question: "La fréquence cardiaque maximale théorique se calcule par :", options: ["220 - âge", "180 + âge", "200 - poids", "Age x 2"], correctAnswers: [0] },
  { id: 28, category: 'sport', question: "Le fair-play signifie :", options: ["Tricher pour gagner", "Respect des règles et de l'adversaire", "Abandonner", "Critiquer l'arbitre"], correctAnswers: [1] },
  
  // PSYCHOLOGIE (7 questions)
  { id: 29, category: 'psychologie', question: "Le stress peut avoir un effet :", options: ["Toujours négatif", "Toujours positif", "Positif ou négatif selon son intensité", "Aucun effet"], correctAnswers: [2] },
  { id: 30, category: 'psychologie', question: "La confiance en soi est :", options: ["Innée uniquement", "Acquise et développable", "Impossible à changer", "Sans importance"], correctAnswers: [1] },
  { id: 31, category: 'psychologie', question: "La concentration en sport est :", options: ["Inutile", "Essentielle à la performance", "Nuisible", "Secondaire"], correctAnswers: [1] },
  { id: 32, category: 'psychologie', question: "L'esprit d'équipe favorise :", options: ["L'individualisme", "La cohésion et la performance collective", "Les conflits", "L'isolement"], correctAnswers: [1] },
  { id: 33, category: 'psychologie', question: "La visualisation mentale consiste à :", options: ["Regarder la télévision", "Imaginer mentalement un geste ou une performance", "Dormir", "Ne rien faire"], correctAnswers: [1] },
  { id: 34, category: 'psychologie', question: "L'échec en sport doit être perçu comme :", options: ["Une catastrophe définitive", "Une opportunité d'apprentissage", "Une honte", "Une fin de carrière"], correctAnswers: [1] },
  { id: 35, category: 'psychologie', question: "La gestion des émotions permet de :", options: ["Supprimer toute émotion", "Contrôler ses réactions pour mieux performer", "Ignorer ses sentiments", "Être insensible"], correctAnswers: [1] },
  
  // BIOLOGIE (5 questions)
  { id: 36, category: 'biologie', question: "Les muscles utilisent comme source d'énergie principale :", options: ["Les protéines", "Le glucose et les lipides", "Les vitamines", "L'eau uniquement"], correctAnswers: [1] },
  { id: 37, category: 'biologie', question: "Pendant l'effort, la fréquence cardiaque :", options: ["Diminue", "Augmente", "Reste stable", "S'arrête"], correctAnswers: [1] },
  { id: 38, category: 'biologie', question: "Les courbatures après l'effort sont dues à :", options: ["Une bonne récupération", "Des micro-lésions musculaires", "Un manque de sommeil", "Une bonne alimentation"], correctAnswers: [1] },
  { id: 39, category: 'biologie', question: "L'hydratation pendant l'effort est :", options: ["Inutile", "Essentielle", "Dangereuse", "Interdite"], correctAnswers: [1] },
  { id: 40, category: 'biologie', question: "La respiration pendant l'effort permet de :", options: ["Apporter de l'oxygène aux muscles", "Refroidir le corps uniquement", "Rien de spécial", "Ralentir le cœur"], correctAnswers: [0] },
];

// ============================================================================
// EXPORT DES CONCOURS
// ============================================================================

export const concoursData: Concours[] = [
  {
    id: 'enam',
    name: 'ENAM - Administration Générale',
    description: 'Concours d\'entrée à l\'École Nationale d\'Administration et de Magistrature - 56 questions',
    icon: 'ENAM',
    categories: enamCategories,
    questions: enamQuestions,
    duration: 120, // 2 heures
    available: true,
  },
  {
    id: 'enaref',
    name: 'ENAREF - Impôts et Domaines',
    description: 'Concours d\'entrée à l\'École Nationale des Régies Financières - 44 questions',
    icon: 'ENAREF',
    categories: enarefCategories,
    questions: enarefQuestions,
    duration: 90, // 1h30
    available: true,
  },
  {
    id: 'ensp',
    name: 'ENSP - Police Nationale',
    description: 'Concours d\'entrée à l\'École Nationale de Police - 50 questions',
    icon: 'ENSP',
    categories: enspCategories,
    questions: enspQuestions,
    duration: 90,
    available: true,
  },
  {
    id: 'sante',
    name: 'Santé - Infirmiers d\'État',
    description: 'Concours d\'entrée aux écoles de santé - 45 questions',
    icon: 'SANTÉ',
    categories: santeCategories,
    questions: santeQuestions,
    duration: 90,
    available: true,
  },
  {
    id: 'ensep',
    name: 'ENSEP - Éducation Physique',
    description: 'Concours d\'entrée à l\'École Nationale des Sports - 40 questions',
    icon: 'ENSEP',
    categories: ensepCategories,
    questions: ensepQuestions,
    duration: 75, // 1h15
    available: false, // Exemple de concours indisponible
  },
];

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

// Récupérer toutes les questions de tous les concours
export const getAllQuestions = (): Question[] => {
  const allQuestions: Question[] = [];
  concoursData.forEach(concours => {
    allQuestions.push(...concours.questions);
  });
  return allQuestions;
};

// Récupérer les questions par catégorie depuis tous les concours
export const getQuestionsByCategory = (category: Category): Question[] => {
  const allQuestions = getAllQuestions();
  return allQuestions.filter(q => q.category === category);
};

// Récupérer un concours par son ID
export const getConcoursById = (id: string): Concours | undefined => {
  return concoursData.find(c => c.id === id);
};

// Récupérer le nombre total de questions d'un concours
export const getTotalQuestionsCount = (concours: Concours): number => {
  return concours.questions.length;
};

// Récupérer le label d'une catégorie
export const getCategoryLabel = (category: Category): string => {
  return categoryLabels[category] || category;
};

// Récupérer le label court d'une catégorie
export const getCategoryLabelShort = (category: Category): string => {
  return categoryLabelsShort[category] || category.substring(0, 3);
};
