/**
 * Barrel file – ré-exporte l'API publique du module certificate.
 * Les consommateurs importent depuis '../services/certificate'.
 */

// Service principal
export { generateCertificate } from './certificateService';

// Fonctions utilitaires réexportées pour rétrocompatibilité
export {
  isEligibleForCertificate,
  getMention,
  safePercentage,
  generateCertificateId,
} from './certificateUtils';

// Types
export type {
  CertificateData,
  CertificateResult,
  CertificateTemplate,
  MentionInfo,
} from './certificateTypes';

// Constantes
export { CERTIFICATE_THRESHOLDS, MIN_CERTIFICATE_PERCENTAGE } from './certificateTypes';
