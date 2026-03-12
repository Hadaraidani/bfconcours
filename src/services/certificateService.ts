/**
 * Service de génération de certificats PDF
 * Design: Académique élégant avec bordure dorée et emblème du Burkina Faso
 */

import jsPDF from 'jspdf';
import QRCode from 'qrcode';

// ============================================================================
// TYPES
// ============================================================================

export interface CertificateData {
  candidateName: string;
  candidatePhone?: string;
  visitorPhone?: string;
  visitorName?: string;
  concoursName: string;
  score: number;
  scoreFinal?: number;
  totalQuestions: number;
  percentage?: number;
  date?: string;
  submissionId?: string;
  rank?: number;
  mention?: string;
  forceGenerate?: boolean;
}

export interface CertificateResult {
  success: boolean;
  certificateId?: string;
  fileName?: string;
  message?: string;
  eligible?: boolean;
}

export interface MentionInfo {
  text: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

// ============================================================================
// CONSTANTES - MENTIONS BASÉES SUR LE SCORE (POURCENTAGE)
// ============================================================================

export const CERTIFICATE_THRESHOLDS = {
  EXCELLENT: { min: 90, label: 'EXCELLENT', color: '#16A34A' },
  TRES_BIEN: { min: 80, label: 'TRÈS BIEN', color: '#2563EB' },
  BIEN: { min: 70, label: 'BIEN', color: '#7C3AED' },
  ASSEZ_BIEN: { min: 60, label: 'ASSEZ BIEN', color: '#EA580C' },
  PASSABLE: { min: 50, label: 'PASSABLE', color: '#CA8A04' },
};

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Génère un ID de certificat unique
 */
export function generateCertificateId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CERT-${year}-${random}`;
}

/**
 * Détermine la mention UNIQUEMENT selon le pourcentage (score)
 * Le rang n'affecte PAS la mention
 */
export function getMention(percentage: number): MentionInfo {
  if (percentage >= 90) {
    return { 
      text: 'EXCELLENT', 
      label: 'EXCELLENT', 
      color: '#16A34A', 
      bgColor: '#DCFCE7', 
      borderColor: '#22C55E' 
    };
  }
  if (percentage >= 80) {
    return { 
      text: 'TRÈS BIEN', 
      label: 'TRÈS BIEN', 
      color: '#2563EB', 
      bgColor: '#DBEAFE', 
      borderColor: '#3B82F6' 
    };
  }
  if (percentage >= 70) {
    return { 
      text: 'BIEN', 
      label: 'BIEN', 
      color: '#7C3AED', 
      bgColor: '#EDE9FE', 
      borderColor: '#8B5CF6' 
    };
  }
  if (percentage >= 60) {
    return { 
      text: 'ASSEZ BIEN', 
      label: 'ASSEZ BIEN', 
      color: '#EA580C', 
      bgColor: '#FFEDD5', 
      borderColor: '#F97316' 
    };
  }
  return { 
    text: 'PASSABLE', 
    label: 'PASSABLE', 
    color: '#CA8A04', 
    bgColor: '#FEF9C3', 
    borderColor: '#EAB308' 
  };
}

/**
 * Vérifie si un candidat est éligible au certificat
 */
export function isEligibleForCertificate(percentage: number, rank?: number, forceGenerate?: boolean): boolean {
  if (rank && rank <= 3) return true;
  if (forceGenerate) return true;
  return percentage >= 50;
}

/**
 * Charge une image depuis une URL
 */
async function loadImage(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
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
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Génère le QR code en base64
 */
async function generateQRCode(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      width: 120,
      margin: 1,
      color: { dark: '#1F2937', light: '#FFFFFF' }
    });
  } catch {
    return '';
  }
}

/**
 * Convertit une couleur hex en RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// ============================================================================
// GÉNÉRATION DU CERTIFICAT PDF
// ============================================================================

export async function generateCertificatePDF(data: CertificateData): Promise<CertificateResult> {
  const {
    candidateName,
    concoursName,
    score,
    scoreFinal,
    totalQuestions,
    date,
    rank,
    forceGenerate
  } = data;

  // Utiliser scoreFinal si disponible, sinon score
  const displayScore = scoreFinal !== undefined ? scoreFinal : score;
  const percentage = Math.round((displayScore / totalQuestions) * 100);

  // Vérifier l'éligibilité
  if (!isEligibleForCertificate(percentage, rank, forceGenerate)) {
    return {
      success: false,
      eligible: false,
      message: `Score insuffisant (${percentage}%). Minimum requis: 50%`
    };
  }

  const certificateId = generateCertificateId();
  
  // La mention est UNIQUEMENT basée sur le pourcentage
  const mentionInfo = getMention(percentage);

  const formattedDate = date || new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  const verificationUrl = `${siteUrl}/verify?id=${certificateId}`;

  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 12;

    // ========================================================================
    // FOND BLANC
    // ========================================================================
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // ========================================================================
    // FILIGRANE "2Kπ Formation"
    // ========================================================================
    doc.setTextColor(248, 248, 248);
    doc.setFontSize(50);
    doc.setFont('helvetica', 'bold');
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        const x = 30 + i * 80;
        const y = 40 + j * 70;
        doc.text('Formation 2026', x, y, { angle: -25 });
      }
    }

    // ========================================================================
    // BORDURE EXTÉRIEURE DORÉE (3 lignes)
    // ========================================================================
    
    // Ligne 1 - extérieure
    doc.setDrawColor(184, 134, 11);
    doc.setLineWidth(2);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
    
    // Ligne 2 - milieu
    doc.setDrawColor(218, 165, 32);
    doc.setLineWidth(0.5);
    doc.rect(margin + 4, margin + 4, pageWidth - 2 * margin - 8, pageHeight - 2 * margin - 8);
    
    // Ligne 3 - intérieure
    doc.setDrawColor(184, 134, 11);
    doc.setLineWidth(1);
    doc.rect(margin + 7, margin + 7, pageWidth - 2 * margin - 14, pageHeight - 2 * margin - 14);

    // ========================================================================
    // COINS DÉCORATIFS
    // ========================================================================
    const drawCorner = (x: number, y: number, rotation: number) => {
      doc.setDrawColor(184, 134, 11);
      doc.setLineWidth(1.5);
      doc.setFillColor(218, 165, 32);
      
      // Petit cercle doré
      doc.circle(x, y, 3, 'FD');
      
      // Lignes décoratives
      const angle1 = rotation * Math.PI / 180;
      const angle2 = (rotation + 90) * Math.PI / 180;
      const len = 12;
      
      doc.line(x, y, x + Math.cos(angle1) * len, y + Math.sin(angle1) * len);
      doc.line(x, y, x + Math.cos(angle2) * len, y + Math.sin(angle2) * len);
    };

    drawCorner(margin + 7, margin + 7, 0);
    drawCorner(pageWidth - margin - 7, margin + 7, 90);
    drawCorner(pageWidth - margin - 7, pageHeight - margin - 7, 180);
    drawCorner(margin + 7, pageHeight - margin - 7, 270);

    // ========================================================================
    // EMBLÈME DU BURKINA FASO
    // ========================================================================
    let currentY = margin + 18;
    
    const emblemData = await loadImage('/images/EBM1.png');
    
    if (emblemData) {
      const emblemSize = 32;
      const emblemX = (pageWidth - emblemSize) / 2;
      doc.addImage(emblemData, 'PNG', emblemX, currentY, emblemSize, emblemSize);
      currentY += emblemSize + 4;
    } else {
      // Fallback : cercle avec couleurs du drapeau
      const cx = pageWidth / 2;
      const cy = currentY + 14;
      
      // Cercle extérieur doré
      doc.setDrawColor(184, 134, 11);
      doc.setLineWidth(2);
      doc.setFillColor(255, 255, 255);
      doc.circle(cx, cy, 14, 'FD');
      
      // Drapeau intérieur
      doc.setFillColor(239, 68, 68); // Rouge
      doc.rect(cx - 10, cy - 10, 20, 6.5, 'F');
      doc.setFillColor(34, 197, 94); // Vert
      doc.rect(cx - 10, cy + 3.5, 20, 6.5, 'F');
      
      // Étoile jaune (simplifiée)
      doc.setFillColor(251, 191, 36);
      doc.circle(cx, cy, 4, 'F');
      
      currentY += 32;
    }

    // ========================================================================
    // BURKINA FASO
    // ========================================================================
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('BURKINA FASO', pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(107, 114, 128);
    doc.text('La Patrie ou la Mort Nous Vaincrons', pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    // ========================================================================
    // SÉPARATEUR DÉCORATIF
    // ========================================================================
    doc.setDrawColor(184, 134, 11);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 50, currentY, pageWidth / 2 - 8, currentY);
    doc.line(pageWidth / 2 + 8, currentY, pageWidth / 2 + 50, currentY);
    
    // Losange central
    doc.setFillColor(184, 134, 11);
    doc.circle(pageWidth / 2, currentY, 2.5, 'F');
    currentY += 10;

    // ========================================================================
    // TITRE "CERTIFICAT DE RÉUSSITE"
    // ========================================================================
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(30);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICAT DE RÉUSSITE', pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    // Double ligne sous le titre
    doc.setDrawColor(184, 134, 11);
    doc.setLineWidth(1.5);
    doc.line(pageWidth / 2 - 65, currentY, pageWidth / 2 + 65, currentY);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 60, currentY + 2, pageWidth / 2 + 60, currentY + 2);
    currentY += 12;

    // ========================================================================
    // "Nous certifions que"
    // ========================================================================
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('Nous certifions que', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // ========================================================================
    // NOM DU CANDIDAT (TRÈS GRAND)
    // ========================================================================
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    const displayName = candidateName.toUpperCase();
    doc.text(displayName, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    // Ligne décorative sous le nom
    const nameWidth = Math.min(doc.getTextWidth(displayName), 140);
    doc.setDrawColor(218, 165, 32);
    doc.setLineWidth(1);
    doc.line(pageWidth / 2 - nameWidth / 2 - 15, currentY, pageWidth / 2 + nameWidth / 2 + 15, currentY);
    currentY += 10;

    // ========================================================================
    // "a réussi avec succès l'évaluation"
    // ========================================================================
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('a réussi avec succès l\'évaluation du concours', pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    // ========================================================================
    // NOM DU CONCOURS
    // ========================================================================
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(concoursName, pageWidth / 2, currentY, { align: 'center' });
    currentY += 12;

    // ========================================================================
    // SECTION RÉSULTATS (3 ÉLÉMENTS SUR UNE LIGNE)
    // ========================================================================
    const resultsY = currentY;
    const boxW = 55;
    const boxH = 18;
    const totalWidth = boxW * 3 + 20; // 3 boîtes + espacement
    const startX = (pageWidth - totalWidth) / 2;

    // Boîte 1: SCORE
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(184, 134, 11);
    doc.setLineWidth(1);
    doc.roundedRect(startX, resultsY, boxW, boxH, 2, 2, 'FD');
    
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('SCORE', startX + boxW / 2, resultsY + 5, { align: 'center' });
    
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${displayScore} / ${totalQuestions}`, startX + boxW / 2, resultsY + 13, { align: 'center' });

    // Boîte 2: POURCENTAGE
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(startX + boxW + 10, resultsY, boxW, boxH, 2, 2, 'FD');
    
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('POURCENTAGE', startX + boxW + 10 + boxW / 2, resultsY + 5, { align: 'center' });
    
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${percentage}%`, startX + boxW + 10 + boxW / 2, resultsY + 13, { align: 'center' });

    // Boîte 3: MENTION (avec couleur)
    const bgRgb = hexToRgb(mentionInfo.bgColor);
    const borderRgb = hexToRgb(mentionInfo.borderColor);
    const textRgb = hexToRgb(mentionInfo.color);
    
    doc.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
    doc.setDrawColor(borderRgb.r, borderRgb.g, borderRgb.b);
    doc.setLineWidth(1.5);
    doc.roundedRect(startX + (boxW + 10) * 2, resultsY, boxW, boxH, 2, 2, 'FD');
    
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('MENTION', startX + (boxW + 10) * 2 + boxW / 2, resultsY + 5, { align: 'center' });
    
    doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(mentionInfo.text, startX + (boxW + 10) * 2 + boxW / 2, resultsY + 13, { align: 'center' });

    currentY = resultsY + boxH + 10;

    // ========================================================================
    // DATE
    // ========================================================================
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Délivré le ${formattedDate}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    // Ligne de séparation
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.3);
    doc.line(margin + 25, currentY, pageWidth - margin - 25, currentY);
    currentY += 8;

    // ========================================================================
    // FOOTER RÉORGANISÉ
    // ========================================================================
    const footerY = currentY;
    const footerSectionWidth = (pageWidth - 2 * margin - 40) / 3;

    // SECTION GAUCHE: Signature
    const leftX = margin + 30;
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Le Directeur', leftX + footerSectionWidth / 2, footerY + 3, { align: 'center' });
    
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.5);
    doc.line(leftX + 10, footerY + 10, leftX + footerSectionWidth - 10, footerY + 10);
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Formation Concours 2026', leftX + footerSectionWidth / 2, footerY + 16, { align: 'center' });

    // SECTION CENTRE: QR Code
    const centerX = pageWidth / 2;
    const qrCode = await generateQRCode(verificationUrl);
    if (qrCode) {
      const qrSize = 18;
      doc.addImage(qrCode, 'PNG', centerX - qrSize / 2, footerY - 2, qrSize, qrSize);
    }
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('Scanner pour vérifier', centerX, footerY + 22, { align: 'center' });

    // SECTION DROITE: Certificat ID
    const rightX = pageWidth - margin - 30 - footerSectionWidth;
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Certificat N°', rightX + footerSectionWidth / 2, footerY + 3, { align: 'center' });
    
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(certificateId, rightX + footerSectionWidth / 2, footerY + 10, { align: 'center' });
    
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    const shortUrl = verificationUrl.replace('https://', '').replace('http://', '');
    doc.text(shortUrl.length > 40 ? shortUrl.substring(0, 40) + '...' : shortUrl, rightX + footerSectionWidth / 2, footerY + 15, { align: 'center' });

    // ========================================================================
    // TÉLÉCHARGEMENT
    // ========================================================================
    const fileName = `Certificat_${candidateName.replace(/\s+/g, '_')}_${certificateId}.pdf`;
    doc.save(fileName);

    return {
      success: true,
      eligible: true,
      certificateId,
      fileName,
      message: `Certificat généré avec succès`
    };

  } catch (error) {
    console.error('Erreur génération certificat:', error);
    return {
      success: false,
      eligible: true,
      message: `Erreur lors de la génération: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
}
