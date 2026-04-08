# Résumé du Système d'Envoi des Copies

Ce document décrit le flux suivi par la copie d'un candidat, depuis la fin de son examen jusqu'à la réception de ses résultats, en passant par le système d'attente sur le tableau de bord (Admin Dashboard).

## 1. Soumission par le Candidat
- Le candidat remplit son QCM sur son interface.
- À la fin de l'examen, il clique sur **Soumettre** (ou le temps imparti s'écoule).
- **Le Front-end (`App.tsx` / `QuizPage.tsx`)** confirme l'envoi de la copie (message de succès) **sans afficher la note** directement à l'écran, afin de préserver la confidentialité et l'annonce officielle des résultats.
- Les réponses, la note (calculée en arrière-plan) et les données de proctoring sont envoyées de manière sécurisée à la base de données Supabase.

## 2. Sauvegarde et Mise en Attente (Backend)
- La copie n'est pas envoyée immédiatement par e-mail ou WhatsApp au candidat.
- Elle est stockée dans les tables concernées (`quiz_attempts`, `scheduled_results`, etc.).
- Le candidat entre dans un état d'**"attente"** de ses résultats officiels.

## 3. Gestion dans le Tableau de Bord Administrateur (Admin Dashboard)
- L'administrateur se connecte à son espace (`AdminDashboard.tsx`).
- Dans la section dédiée aux résultats ou à la programmation d'envois, il peut visualiser toutes les copies reçues.
- L'administrateur a une vue complète sur :
  - L'identité du candidat (Nom, Téléphone, E-mail s'il y en a un).
  - La note obtenue, le détail des bonnes/mauvaises réponses.
  - Les alertes éventuelles de la surveillance (proctoring).

## 4. Déclenchement de l'Envoi des Résultats
L'administrateur dispose de deux méthodes principales pour la transmission du résultat (note finale et lien de correction détaillée) aux candidats :

1. **Envoi programmé (Edge Function / Cron) :** L'administrateur a défini au préalable une date et une heure de publication globale. Une fois ce moment atteint, le système (ex. Edge Function de Supabase) expédie de manière automatique et asynchrone toutes les notifications.
2. **Envoi manuel :** L'administrateur débloque manuellement l'envoi des notifications depuis l'interface (via des boutons d'actions en masse ou individuels), pour chaque candidat ou par groupe.

## 5. Réception par le Candidat
- Sitôt l'envoi validé depuis le tableau de bord ou l'Edge Function, le candidat reçoit son résultat final.
- Si le candidat a un compte / e-mail valide, il est notifié par **E-mail**.
- S'il n'a pas d'e-mail ou préfère un autre canal, il reçoit une notification automatique sur **WhatsApp** avec sa note et le lien d'accès à la correction détaillée.
