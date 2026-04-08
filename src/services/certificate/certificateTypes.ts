/**
 * Types et interfaces pour le système de certificats
 * Séparation complète entre DATA (candidat) et DESIGN (template)
 */

// ============================================================================
// DATA — Données du candidat
// ============================================================================

export interface CertificateData {
  candidateName: string;
  candidatePhone?: string;
  concoursName: string;
  score: number;
  scoreFinal?: number;
  totalQuestions: number;
  percentage?: number;
  /** Date réelle de soumission (ISO string ou chaîne formatée) */
  submissionDate?: string;
  /** @deprecated Utiliser submissionDate à la place */
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
  dataUri?: string;
}

export interface MentionInfo {
  text: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

// ============================================================================
// DESIGN — Structure du Template JSON
// ============================================================================

export interface TemplateTextStyle {
  fontFamily?: 'helvetica' | 'times' | 'courier';
  fontSize: number;
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
  color: string;
  align?: 'left' | 'center' | 'right';
}

export interface ElementBorder {
  visible: boolean;
  exportVisible?: boolean;
  width: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted' | 'double';
  opacity: number;
  radius: number;
  padding?: number;
}

export interface TemplateElement {
  x: number;
  y: number;
  text?: string;
  style?: TemplateTextStyle;
  fontSize?: number;
  color?: string;
  visible?: boolean;
  border?: ElementBorder;
}

export interface TemplateBorderLine {
  color: string;
  width: number;
  inset: number;
}

export interface TemplateResultBox {
  y: number;
  width: number;
  height: number;
  gap: number;
  labelFontSize: number;
  valueFontSize: number;
  fillColor: string;
  borderColor: string;
  labelColor: string;
  valueColor: string;
  cornerRadius: number;
  elementBorder?: ElementBorder;
}

export interface CustomTextElement extends TemplateElement {
  id: string;
}

export interface CustomImageElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string; // Base64
  border?: ElementBorder;
}

export interface CertificateTemplate {
  /** Nom du template pour identification */
  name: string;
  version: string;

  page: {
    orientation: 'landscape' | 'portrait';
    format: 'a4' | 'letter';
    margin: number;
  };

  background?: {
    imageBase64?: string;
    color?: string; // Couleur de fond HEX (défaut: #FFFFFF)
    visible: boolean;
    /** Opacité de l'image de fond (0 = transparent, 1 = opaque). Défaut: 1 */
    opacity?: number;
    /** Mode de redimensionnement. Défaut: 'cover' */
    size?: 'cover' | 'contain' | 'custom';
    /** Position CSS de l'image. Défaut: 'center' */
    position?: 'center' | 'top left' | 'top center' | 'top right' | 'center left' | 'center right' | 'bottom left' | 'bottom center' | 'bottom right';
    /** Répétition de l'image. Défaut: 'no-repeat' */
    repeat?: 'no-repeat' | 'repeat';
    /** Facteur de zoom pour le mode 'custom' (0.1–3). Défaut: 1 */
    zoom?: number;
    /** Décalage horizontal en mm (drag). Défaut: 0 */
    offsetX?: number;
    /** Décalage vertical en mm (drag). Défaut: 0 */
    offsetY?: number;
  };

  globalElementBorders?: {
    enabled: boolean;
    border: ElementBorder;
  };

  customTexts?: CustomTextElement[];
  customImages?: CustomImageElement[];

  watermark: {
    text: string;
    fontSize: number;
    angle: number;
    color: string;
    columns: number;
    rows: number;
    startX: number;
    startY: number;
    spacingX: number;
    spacingY: number;
    visible: boolean;
  };

  borders: {
    outer: TemplateBorderLine;
    middle: TemplateBorderLine;
    inner: TemplateBorderLine;
    corners: {
      visible: boolean;
      radius: number;
      lineWidth: number;
      lineLength: number;
      fillColor: string;
      strokeColor: string;
    };
  };

  emblem: {
    /** Source de l'image (URL relative ou base64) */
    src: string;
    width: number;
    height: number;
    x: number;
    y: number;
    fallbackVisible: boolean;
  };

  header: {
    countryName: TemplateElement;
    motto: TemplateElement;
    separator: {
      x: number;
      y: number;
      lineColor: string;
      lineWidth: number;
      halfLength: number;
      gap: number;
      dotRadius: number;
      dotColor: string;
    };
  };

  title: {
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    underline: {
      y: number;
      color: string;
      width1: number;
      width2: number;
      length1: number;
      length2: number;
      gap: number;
    };
  };

  body: {
    prefixText: TemplateElement;
    candidateName: {
      x: number;
      y: number;
      fontSize: number;
      maxFontSize: number;
      minFontSize: number;
      color: string;
      maxWidth: number;
      underlineColor: string;
      underlineWidth: number;
      underlinePadding: number;
    };
    successText: TemplateElement;
    concoursName: TemplateElement;
  };

  results: TemplateResultBox;

  date: TemplateElement;

  footer: {
    separator: {
      y: number;
      color: string;
      width: number;
      marginX: number;
    };
    signature: {
      x: number;
      y: number;
      title: string;
      name: string;
      titleStyle: TemplateTextStyle;
      nameStyle: TemplateTextStyle;
      lineColor: string;
      lineWidth: number;
    };
    qrCode: {
      x: number;
      y: number;
      size: number;
      visible: boolean;
      label: string;
      labelStyle: TemplateTextStyle;
    };
    certificateId: {
      x: number;
      y: number;
      label: string;
      labelStyle: TemplateTextStyle;
      valueStyle: TemplateTextStyle;
      urlStyle: TemplateTextStyle;
      maxUrlLength: number;
    };
  };
}

// ============================================================================
// CONSTANTES
// ============================================================================

export const CERTIFICATE_THRESHOLDS = {
  EXCELLENT: { min: 90, label: 'EXCELLENT', color: '#16A34A' },
  TRES_BIEN: { min: 80, label: 'TRÈS BIEN', color: '#2563EB' },
  BIEN: { min: 70, label: 'BIEN', color: '#7C3AED' },
  ASSEZ_BIEN: { min: 60, label: 'ASSEZ BIEN', color: '#EA580C' },
  PASSABLE: { min: 50, label: 'PASSABLE', color: '#CA8A04' },
} as const;

export const MENTION_MAP: { minPercent: number; info: MentionInfo }[] = [
  { minPercent: 90, info: { text: 'EXCELLENT', label: 'EXCELLENT', color: '#16A34A', bgColor: '#DCFCE7', borderColor: '#22C55E' } },
  { minPercent: 80, info: { text: 'TRÈS BIEN', label: 'TRÈS BIEN', color: '#2563EB', bgColor: '#DBEAFE', borderColor: '#3B82F6' } },
  { minPercent: 70, info: { text: 'BIEN', label: 'BIEN', color: '#7C3AED', bgColor: '#EDE9FE', borderColor: '#8B5CF6' } },
  { minPercent: 60, info: { text: 'ASSEZ BIEN', label: 'ASSEZ BIEN', color: '#EA580C', bgColor: '#FFEDD5', borderColor: '#F97316' } },
  { minPercent: 0,  info: { text: 'PASSABLE', label: 'PASSABLE', color: '#CA8A04', bgColor: '#FEF9C3', borderColor: '#EAB308' } },
];

/** Seuil minimal de pourcentage pour obtenir un certificat */
export const MIN_CERTIFICATE_PERCENTAGE = 50;

/** Timeout pour le chargement d'images (ms) */
export const IMAGE_LOAD_TIMEOUT_MS = 3000;
