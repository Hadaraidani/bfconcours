/**
 * Fonctions utilitaires pures pour le système de certificats
 * Aucune dépendance vers jsPDF ici (sauf le type pour fitText)
 */

import QRCode from 'qrcode';
import type jsPDF from 'jspdf';
import {
  type MentionInfo,
  MENTION_MAP,
  MIN_CERTIFICATE_PERCENTAGE,
  IMAGE_LOAD_TIMEOUT_MS,
} from './certificateTypes';

// ============================================================================
// Identifiant unique
// ============================================================================

/**
 * Génère un identifiant de certificat unique (ex: CERT-2026-A3BX9K)
 */
export function generateCertificateId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CERT-${year}-${random}`;
}

// ============================================================================
// Calculs métier
// ============================================================================

/**
 * Calcule le pourcentage de manière sécurisée.
 * Retourne 0 si totalQuestions est 0 ou négatif → évite NaN / Infinity.
 */
export function safePercentage(score: number, totalQuestions: number): number {
  if (!totalQuestions || totalQuestions <= 0) return 0;
  return Math.round((score / totalQuestions) * 100);
}

/**
 * Détermine la mention UNIQUEMENT selon le pourcentage.
 * Le rang n'affecte PAS la mention.
 */
export function getMention(percentage: number): MentionInfo {
  for (const entry of MENTION_MAP) {
    if (percentage >= entry.minPercent) {
      return { ...entry.info };
    }
  }
  // Fallback (ne devrait jamais arriver)
  return MENTION_MAP[MENTION_MAP.length - 1].info;
}

/**
 * Vérifie si un candidat est éligible au certificat.
 */
export function isEligibleForCertificate(
  percentage: number,
  rank?: number,
  forceGenerate?: boolean,
): boolean {
  if (rank && rank <= 3) return true;
  if (forceGenerate) return true;
  return percentage >= MIN_CERTIFICATE_PERCENTAGE;
}

// ============================================================================
// Couleurs
// ============================================================================

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convertit une couleur hexadécimale (#RRGGBB) en objet RGB.
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

// ============================================================================
// Chargement d'images (avec timeout)
// ============================================================================

/**
 * Charge une image depuis une URL et la convertit en data-URL base64.
 * Renvoie null si le chargement échoue ou dépasse le timeout.
 */
export async function loadImageWithTimeout(
  url: string,
  timeoutMs: number = IMAGE_LOAD_TIMEOUT_MS,
): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(null);
    }, timeoutMs);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

// ============================================================================
// QR Code
// ============================================================================

/**
 * Génère un QR code en data-URL base64.
 * Retourne une chaîne vide en cas d'erreur.
 */
export async function generateQRCodeBase64(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      width: 120,
      margin: 1,
      color: { dark: '#1F2937', light: '#FFFFFF' },
    });
  } catch {
    return '';
  }
}

// ============================================================================
// Texte adaptatif (anti-débordement)
// ============================================================================

/**
 * Réduit dynamiquement la taille de police pour qu'un texte
 * tienne dans une largeur maximale donnée (en mm).
 *
 * @returns La taille de police finale utilisée.
 */
export function fitText(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  initialFontSize: number,
  minFontSize: number = 12,
): number {
  let fontSize = initialFontSize;
  doc.setFontSize(fontSize);

  while (doc.getTextWidth(text) > maxWidth && fontSize > minFontSize) {
    fontSize -= 0.5;
    doc.setFontSize(fontSize);
  }

  return fontSize;
}
