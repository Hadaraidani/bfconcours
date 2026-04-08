/**
 * SERVICE DE NOTIFICATIONS
 * 
 * Gère les notifications in-app (toasts) et l'envoi d'emails aux candidats.
 * 
 * Fonctionnalités :
 * - Toasts in-app (succès, erreur, info, warning)
 * - Historique des notifications (centre de notifications)
 * - Envoi d'email de résultats aux candidats via EmailJS
 * - Système d'événements pour les composants React
 */

import emailjs from '@emailjs/browser';
import { AppNotification, NotificationType } from '../types';
import { EMAILJS_CONFIG } from '../config/emailjs';

// ============================================================
// TYPES INTERNES
// ============================================================

type NotificationListener = (notification: AppNotification) => void;
type NotificationRemoveListener = (id: string) => void;

interface NotificationCallbacks {
  onAdd: NotificationListener[];
  onRemove: NotificationRemoveListener[];
  onUpdate: (() => void)[];
}

// ============================================================
// ÉTAT GLOBAL
// ============================================================

let notifications: AppNotification[] = [];
const MAX_NOTIFICATIONS = 50;

const callbacks: NotificationCallbacks = {
  onAdd: [],
  onRemove: [],
  onUpdate: [],
};

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

const generateId = (): string => {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ============================================================
// GESTION DES NOTIFICATIONS
// ============================================================

/**
 * Ajouter une notification
 */
export const addNotification = (
  type: NotificationType,
  title: string,
  message: string,
  options?: {
    duration?: number;
    action?: { label: string; onClick: () => void };
  }
): AppNotification => {
  const notification: AppNotification = {
    id: generateId(),
    type,
    title,
    message,
    timestamp: new Date(),
    read: false,
    duration: options?.duration ?? 5000,
    action: options?.action,
  };

  notifications = [notification, ...notifications].slice(0, MAX_NOTIFICATIONS);

  // Notifier les listeners
  callbacks.onAdd.forEach(cb => cb(notification));
  callbacks.onUpdate.forEach(cb => cb());

  return notification;
};

/**
 * Raccourcis pour chaque type
 */
export const notifySuccess = (title: string, message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) =>
  addNotification('success', title, message, options);

export const notifyError = (title: string, message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) =>
  addNotification('error', title, message, { duration: 8000, ...options });

export const notifyInfo = (title: string, message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) =>
  addNotification('info', title, message, options);

export const notifyWarning = (title: string, message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) =>
  addNotification('warning', title, message, { duration: 7000, ...options });

/**
 * Supprimer une notification (du toast)
 */
export const removeNotification = (id: string): void => {
  callbacks.onRemove.forEach(cb => cb(id));
};

/**
 * Marquer une notification comme lue
 */
export const markAsRead = (id: string): void => {
  const notif = notifications.find(n => n.id === id);
  if (notif) {
    notif.read = true;
    callbacks.onUpdate.forEach(cb => cb());
  }
};

/**
 * Marquer toutes les notifications comme lues
 */
export const markAllAsRead = (): void => {
  notifications.forEach(n => { n.read = true; });
  callbacks.onUpdate.forEach(cb => cb());
};

/**
 * Obtenir toutes les notifications
 */
export const getNotifications = (): AppNotification[] => {
  return [...notifications];
};

/**
 * Nombre de notifications non lues
 */
export const getUnreadCount = (): number => {
  return notifications.filter(n => !n.read).length;
};

/**
 * Effacer toutes les notifications
 */
export const clearNotifications = (): void => {
  notifications = [];
  callbacks.onUpdate.forEach(cb => cb());
};

// ============================================================
// LISTENERS (pour les composants React)
// ============================================================

export const onNotificationAdded = (listener: NotificationListener): (() => void) => {
  callbacks.onAdd.push(listener);
  return () => {
    callbacks.onAdd = callbacks.onAdd.filter(cb => cb !== listener);
  };
};

export const onNotificationRemoved = (listener: NotificationRemoveListener): (() => void) => {
  callbacks.onRemove.push(listener);
  return () => {
    callbacks.onRemove = callbacks.onRemove.filter(cb => cb !== listener);
  };
};

export const onNotificationsUpdated = (listener: () => void): (() => void) => {
  callbacks.onUpdate.push(listener);
  return () => {
    callbacks.onUpdate = callbacks.onUpdate.filter(cb => cb !== listener);
  };
};

// ============================================================
// ENVOI D'EMAIL AU CANDIDAT
// ============================================================

interface CandidateEmailParams {
  candidateEmail: string;
  candidateName: string;
  concoursName: string;
  score: number;
  scoreFinal?: number;
  totalQuestions: number;
  bonnesReponses: number;
  mauvaisesReponses: number;
  sansReponse: number;
  correctionUrl?: string;
  percentage: number;
}

/**
 * Envoyer un email de résultats au candidat
 */
export const sendCandidateResultEmail = async (params: CandidateEmailParams): Promise<boolean> => {
  try {
    // Vérifier que le template candidat est configuré
    if (!EMAILJS_CONFIG.candidateTemplateId || EMAILJS_CONFIG.candidateTemplateId === 'template_candidate') {
      console.log('📧 Template EmailJS candidat non configuré - email non envoyé');
      console.log('   Pour activer: créez un template "template_candidate" dans votre dashboard EmailJS');
      return false;
    }

    const displayScore = params.scoreFinal !== undefined ? params.scoreFinal : params.score;
    const mentionText = params.percentage >= 90 ? 'Excellent' :
                        params.percentage >= 80 ? 'Très Bien' :
                        params.percentage >= 70 ? 'Bien' :
                        params.percentage >= 60 ? 'Assez Bien' :
                        params.percentage >= 50 ? 'Passable' : 'Insuffisant';

    const templateParams = {
      to_email: params.candidateEmail,
      candidate_name: params.candidateName,
      concours_name: params.concoursName,
      score: displayScore,
      total_questions: params.totalQuestions,
      bonnes_reponses: params.bonnesReponses,
      mauvaises_reponses: params.mauvaisesReponses,
      sans_reponse: params.sansReponse,
      percentage: params.percentage,
      mention: mentionText,
      correction_url: params.correctionUrl || '',
      submission_date: new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.candidateTemplateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    );

    console.log('✅ Email de résultats envoyé au candidat:', params.candidateEmail);
    notifySuccess(
      'Email envoyé',
      `Vos résultats ont été envoyés à ${params.candidateEmail}`
    );
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi email candidat:', error);
    // Ne pas afficher d'erreur intrusive, juste un log
    console.log('   L\'email au candidat n\'a pas pu être envoyé. Vérifiez la configuration EmailJS.');
    return false;
  }
};

// ============================================================
// EXPORT PAR DÉFAUT
// ============================================================

export default {
  addNotification,
  notifySuccess,
  notifyError,
  notifyInfo,
  notifyWarning,
  removeNotification,
  markAsRead,
  markAllAsRead,
  getNotifications,
  getUnreadCount,
  clearNotifications,
  onNotificationAdded,
  onNotificationRemoved,
  onNotificationsUpdated,
  sendCandidateResultEmail,
};
