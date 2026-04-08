/**
 * Service principal d'orchestration de la génération de certificats.
 *
 * Fonction publique : generateCertificate(data, template?)
 *   - Valide les données
 *   - Charge le template (passé ou par défaut)
 *   - Prépare les assets (emblème, QR code)
 *   - Crée l'instance jsPDF
 *   - Délègue le rendu à renderCertificate()
 *   - Déclenche le téléchargement
 */

import jsPDF from 'jspdf';

import type {
  CertificateData,
  CertificateResult,
  CertificateTemplate,
} from './certificateTypes';

import {
  generateCertificateId,
  safePercentage,
  getMention,
  isEligibleForCertificate,
  loadImageWithTimeout,
  generateQRCodeBase64,
} from './certificateUtils';

import { renderCertificate, type RenderData } from './certificateTemplate';

import defaultTemplateJson from './defaultTemplate.json';

// ============================================================================
// Template par défaut (cast du JSON importé)
// ============================================================================

/**
 * Le template par défaut est chargé depuis le fichier JSON local.
 * Il peut être remplacé par un template personnalisé passé en paramètre.
 */
const DEFAULT_TEMPLATE = defaultTemplateJson as unknown as CertificateTemplate;

// ============================================================================
// Fonction principale
// ============================================================================

/**
 * Génère un certificat PDF et déclenche son téléchargement.
 *
 * @param data - Les données du candidat (score, nom, concours, etc.)
 * @param template - (Optionnel) Template de design. Si omis, utilise le template par défaut.
 * @returns Résultat de la génération (succès/échec, ID certificat, nom du fichier)
 */
export async function generateCertificate(
  data: CertificateData,
  template?: CertificateTemplate,
  options?: { returnBase64?: boolean; isExport?: boolean }
): Promise<CertificateResult> {
  let activeTemplate = template || DEFAULT_TEMPLATE;

  // Si aucun template n'est fourni, on essaie de charger le Global depuis le localStorage
  if (!template && typeof window !== 'undefined') {
    const saved = localStorage.getItem('certificate_global_template');
    if (saved) {
      try {
        activeTemplate = JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse local template, using default.");
      }
    }
  }

  // -------------------------------------------------------------------------
  // 1. Validation des données
  // -------------------------------------------------------------------------
  const {
    candidateName,
    concoursName,
    score,
    scoreFinal,
    totalQuestions,
    rank,
    forceGenerate,
  } = data;

  if (!totalQuestions || totalQuestions <= 0) {
    return {
      success: false,
      eligible: false,
      message: 'Nombre de questions invalide (doit être > 0)',
    };
  }

  // Utiliser scoreFinal si disponible, sinon score
  const displayScore = scoreFinal !== undefined ? scoreFinal : score;
  const percentage = safePercentage(displayScore, totalQuestions);

  // Vérifier l'éligibilité
  if (!isEligibleForCertificate(percentage, rank, forceGenerate)) {
    return {
      success: false,
      eligible: false,
      message: `Score insuffisant (${percentage}%). Minimum requis: 50%`,
    };
  }

  // -------------------------------------------------------------------------
  // 2. Préparer les métadonnées
  // -------------------------------------------------------------------------
  const certificateId = generateCertificateId();
  const mentionInfo = getMention(percentage);

  // Date : utiliser submissionDate (date réelle) > date > date système
  const formattedDate =
    data.submissionDate ||
    data.date ||
    new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const siteUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL) ||
    window.location.origin;
  const verificationUrl = `${siteUrl}/verify?id=${certificateId}`;

  // -------------------------------------------------------------------------
  // 3. Charger les assets en parallèle
  // -------------------------------------------------------------------------
  try {
    const [emblemBase64, qrCodeBase64] = await Promise.all([
      // Si le src est déjà du base64, ne pas re-charger
      activeTemplate.emblem.src.startsWith('data:')
        ? Promise.resolve(activeTemplate.emblem.src)
        : loadImageWithTimeout(activeTemplate.emblem.src),
      generateQRCodeBase64(verificationUrl),
    ]);

    // -----------------------------------------------------------------------
    // 4. Créer l'instance jsPDF
    // -----------------------------------------------------------------------
    const doc = new jsPDF({
      orientation: activeTemplate.page.orientation,
      unit: 'mm',
      format: activeTemplate.page.format,
    });

    // -----------------------------------------------------------------------
    // 5. Assembler les données enrichies pour le renderer
    // -----------------------------------------------------------------------
    const renderData: RenderData = {
      candidateName,
      concoursName,
      displayScore,
      totalQuestions,
      percentage,
      mentionInfo,
      formattedDate,
      certificateId,
      verificationUrl,
      emblemBase64,
      qrCodeBase64,
    };

    // -----------------------------------------------------------------------
    // 6. Dessiner le certificat
    // -----------------------------------------------------------------------
    renderCertificate(doc, activeTemplate, renderData, { isExport: options?.isExport });

    // -----------------------------------------------------------------------
    // 7. Télécharger ou Retourner Base64
    // -----------------------------------------------------------------------
    const fileName = `Certificat_${candidateName.replace(/\s+/g, '_')}_${certificateId}.pdf`;
    
    if (options?.returnBase64) {
      return {
        success: true,
        eligible: true,
        certificateId,
        fileName,
        dataUri: doc.output('datauristring'),
        message: 'Certificat généré avec succès en Base64',
      };
    }

    doc.save(fileName);

    return {
      success: true,
      eligible: true,
      certificateId,
      fileName,
      message: 'Certificat généré avec succès',
    };
  } catch (error) {
    console.error('Erreur génération certificat:', error);
    return {
      success: false,
      eligible: true,
      message: `Erreur lors de la génération: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    };
  }
}
