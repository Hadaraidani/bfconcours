/**
 * Moteur de rendu PDF piloté par un template JSON (Coordonnées Absolues)
 * Chaque élément est dessiné à la position (x, y) définie dans le template.
 */

import type jsPDF from 'jspdf';
import type { CertificateTemplate, MentionInfo, ElementBorder } from './certificateTypes';
import { hexToRgb, fitText } from './certificateUtils';

// ============================================================================
// Types internes
// ============================================================================

export interface RenderData {
  candidateName: string;
  concoursName: string;
  displayScore: number;
  totalQuestions: number;
  percentage: number;
  mentionInfo: MentionInfo;
  formattedDate: string;
  certificateId: string;
  verificationUrl: string;
  emblemBase64: string | null;
  qrCodeBase64: string;
}

function getPageDimensions(template: CertificateTemplate) {
  const isLandscape = template.page.orientation === 'landscape';
  return {
    width: isLandscape ? 297 : 210,
    height: isLandscape ? 210 : 297,
    margin: template.page.margin,
  };
}

function applyTextStyle(doc: jsPDF, style: { fontSize: number; fontStyle?: string; color: string; fontFamily?: string }) {
  doc.setFontSize(style.fontSize);
  const fontStyle = style.fontStyle || 'normal';
  const fontFamily = style.fontFamily || 'helvetica';
  doc.setFont(fontFamily, fontStyle);
  const rgb = hexToRgb(style.color);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
}

// ============================================================================
// BORDURES ÉLÉMENTS (UTILITIES)
// ============================================================================

function getEffectiveBorder(elemBorder?: ElementBorder, globalBorderConfig?: {enabled: boolean, border: ElementBorder}): ElementBorder | undefined {
  if (globalBorderConfig?.enabled && globalBorderConfig.border) return globalBorderConfig.border;
  return elemBorder?.visible ? elemBorder : undefined;
}

function drawElementBorder(doc: jsPDF, x: number, y: number, w: number, h: number, border: ElementBorder, isExport: boolean = false) {
  if (isExport && border.exportVisible === false) return;

  const pad = border.padding || 0;
  const drawX = x - pad;
  const drawY = y - pad;
  const drawW = w + pad * 2;
  const drawH = h + pad * 2;

  doc.setLineWidth(border.width);
  const rgb = hexToRgb(border.color);
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);

  if (border.style === 'dashed') {
    doc.setLineDashPattern([3, 3], 0);
  } else if (border.style === 'dotted') {
    doc.setLineDashPattern([1, 2], 0);
  } else {
    doc.setLineDashPattern([], 0);
  }

  const applyOpacity = () => {
    if (border.opacity < 1) {
      const gState = new (doc as any).GState({ opacity: border.opacity });
      doc.saveGraphicsState();
      doc.setGState(gState);
      return true;
    }
    return false;
  };
  const restoreOpacity = (wasApplied: boolean) => {
    if (wasApplied) doc.restoreGraphicsState();
  };

  const wasOp = applyOpacity();

  if (border.style === 'double') {
    const gap = Math.max(0.5, border.width * 1.5);
    doc.setLineWidth(border.width / 3);
    doc.roundedRect(drawX, drawY, drawW, drawH, border.radius, border.radius, 'S');
    doc.roundedRect(drawX - gap, drawY - gap, drawW + gap*2, drawH + gap*2, border.radius + gap, border.radius + gap, 'S');
  } else {
    doc.roundedRect(drawX, drawY, drawW, drawH, border.radius, border.radius, 'S');
  }

  restoreOpacity(wasOp);
  doc.setLineDashPattern([], 0);
}

function processTextBorder(doc: jsPDF, text: string, x: number, y: number, align: string, borderDef?: ElementBorder, globalBorderConfig?: {enabled: boolean, border: ElementBorder}, isExport?: boolean) {
  const border = getEffectiveBorder(borderDef, globalBorderConfig);
  if (!border) return;
  const w = doc.getTextWidth(text);
  const h = doc.getFontSize() * 0.352778; // Approx pt to mm
  let leftX = x;
  if (align === 'center') leftX = x - w/2;
  else if (align === 'right') leftX = x - w;
  const topY = y - h/2; // assuming middle baseline
  drawElementBorder(doc, leftX, topY, w, h, border, isExport);
}

// ============================================================================
// 1. FOND + FILIGRANE
// ============================================================================

function drawBackground(doc: jsPDF, template: CertificateTemplate): void {
  const { width, height } = getPageDimensions(template);
  const bg = template.background;

  // Fond coloré (blanc par défaut, ou couleur personnalisée)
  const bgColor = bg?.color || '#FFFFFF';
  const bgRgb = hexToRgb(bgColor);
  doc.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
  doc.rect(0, 0, width, height, 'F');

  // Arrière-plan image personnalisé
  if (bg && bg.visible && bg.imageBase64) {
    const opacity = bg.opacity ?? 1;
    const sizeMode = bg.size || 'cover';
    const position = bg.position || 'center';
    const repeat = bg.repeat || 'no-repeat';
    const customZoom = bg.zoom ?? 1;
    const offsetX = bg.offsetX ?? 0;
    const offsetY = bg.offsetY ?? 0;

    try {
      // Appliquer l'opacité via GState
      if (opacity < 1) {
        const gState = new (doc as any).GState({ opacity: opacity });
        doc.saveGraphicsState();
        doc.setGState(gState);
      }

      // Charger les dimensions intrinsèques de l'image
      const imgProps = doc.getImageProperties(bg.imageBase64);
      const imgW = imgProps.width;
      const imgH = imgProps.height;
      const imgRatio = imgW / imgH;
      const pageRatio = width / height;

      let drawW: number;
      let drawH: number;
      let drawX: number;
      let drawY: number;

      if (sizeMode === 'cover') {
        // Cover : remplir la page, image peut déborder
        if (imgRatio > pageRatio) {
          drawH = height;
          drawW = height * imgRatio;
        } else {
          drawW = width;
          drawH = width / imgRatio;
        }
      } else if (sizeMode === 'contain') {
        // Contain : l'image tient entièrement dans la page
        if (imgRatio > pageRatio) {
          drawW = width;
          drawH = width / imgRatio;
        } else {
          drawH = height;
          drawW = height * imgRatio;
        }
      } else {
        // Custom : zoom manuel
        drawW = width * customZoom;
        drawH = (width / imgRatio) * customZoom;
      }

      // Calculer la position de base
      drawX = 0;
      drawY = 0;

      if (position.includes('center') && !position.includes('left') && !position.includes('right')) {
        drawX = (width - drawW) / 2;
      } else if (position.includes('right')) {
        drawX = width - drawW;
      }
      // 'left' → drawX = 0 (déjà)

      if (position === 'center' || position === 'center left' || position === 'center right') {
        drawY = (height - drawH) / 2;
      } else if (position.includes('bottom')) {
        drawY = height - drawH;
      }
      // 'top' → drawY = 0 (déjà)

      // Appliquer les décalages du drag
      drawX += offsetX;
      drawY += offsetY;

      if (repeat === 'repeat') {
        // Tiling : dessiner l'image en répétition
        const startXPos = drawX % drawW - drawW;
        const startYPos = drawY % drawH - drawH;
        for (let tileX = startXPos; tileX < width; tileX += drawW) {
          for (let tileY = startYPos; tileY < height; tileY += drawH) {
            doc.addImage(bg.imageBase64, 'PNG', tileX, tileY, drawW, drawH);
          }
        }
      } else {
        doc.addImage(bg.imageBase64, 'PNG', drawX, drawY, drawW, drawH);
      }

      // Restaurer l'état graphique si opacité modifiée
      if (opacity < 1) {
        doc.restoreGraphicsState();
      }
    } catch (e) {
      console.warn("Erreur dessin arrière-plan:", e);
    }
  }

  // Filigrane
  const wm = template.watermark;
  if (!wm.visible) return;

  const wmRgb = hexToRgb(wm.color);
  doc.setTextColor(wmRgb.r, wmRgb.g, wmRgb.b);
  doc.setFontSize(wm.fontSize);
  doc.setFont('helvetica', 'bold');

  for (let i = 0; i < wm.columns; i++) {
    for (let j = 0; j < wm.rows; j++) {
      const x = wm.startX + i * wm.spacingX;
      const y = wm.startY + j * wm.spacingY;
      doc.text(wm.text, x, y, { angle: wm.angle, align: 'center', baseline: 'middle' });
    }
  }

  const border = getEffectiveBorder((wm as any).border, template.globalElementBorders);
  if (border) {
    const totalW = (wm.columns - 1) * wm.spacingX;
    const totalH = (wm.rows - 1) * wm.spacingY;
    drawElementBorder(doc, wm.startX - totalW/2 - 10, wm.startY - totalH/2 - 10, totalW + 20, totalH + 20, border, false);
  }
}

// ============================================================================
// 2. BORDURES + COINS
// ============================================================================

function drawBorders(doc: jsPDF, template: CertificateTemplate): void {
  const { width, height, margin } = getPageDimensions(template);
  const b = template.borders;

  const lines = [b.outer, b.middle, b.inner];
  for (const line of lines) {
    const rgb = hexToRgb(line.color);
    doc.setDrawColor(rgb.r, rgb.g, rgb.b);
    doc.setLineWidth(line.width);
    doc.rect(
      margin + line.inset,
      margin + line.inset,
      width - 2 * margin - 2 * line.inset,
      height - 2 * margin - 2 * line.inset,
    );
  }

  if (!b.corners.visible) return;

  const innerInset = b.inner.inset;
  const cornerPositions = [
    { x: margin + innerInset, y: margin + innerInset, rotation: 0 },
    { x: width - margin - innerInset, y: margin + innerInset, rotation: 90 },
    { x: width - margin - innerInset, y: height - margin - innerInset, rotation: 180 },
    { x: margin + innerInset, y: height - margin - innerInset, rotation: 270 },
  ];

  const strokeRgb = hexToRgb(b.corners.strokeColor);
  const fillRgb = hexToRgb(b.corners.fillColor);

  for (const pos of cornerPositions) {
    doc.setDrawColor(strokeRgb.r, strokeRgb.g, strokeRgb.b);
    doc.setLineWidth(b.corners.lineWidth);
    doc.setFillColor(fillRgb.r, fillRgb.g, fillRgb.b);
    doc.circle(pos.x, pos.y, b.corners.radius, 'FD');

    const angle1 = (pos.rotation * Math.PI) / 180;
    const angle2 = ((pos.rotation + 90) * Math.PI) / 180;
    const len = b.corners.lineLength;
    doc.line(pos.x, pos.y, pos.x + Math.cos(angle1) * len, pos.y + Math.sin(angle1) * len);
    doc.line(pos.x, pos.y, pos.x + Math.cos(angle2) * len, pos.y + Math.sin(angle2) * len);
  }
}

// ============================================================================
// 3. EMBLÈME
// ============================================================================

function drawEmblem(doc: jsPDF, template: CertificateTemplate, emblemBase64: string | null): void {
  const emb = template.emblem;
  if (!emb) return;

  if (emblemBase64) {
    // x, y réfèrent généralement au centre de l'image (si on veut faciliter le drag drop).
    // Mais pour l'image addImage(x, y) est le coin haut gauche.
    // On va considérer que le json.x et json.y définissent le coin haut-gauche pour l'emblem.
    const x = emb.x - emb.width / 2;
    const border = getEffectiveBorder((emb as any).border, template.globalElementBorders);
    if (border) drawElementBorder(doc, x, emb.y, emb.width, emb.height, border, false);
    doc.addImage(emblemBase64, 'PNG', x, emb.y, emb.width, emb.height);
  } else if (emb.fallbackVisible) {
    const cx = emb.x;
    const cy = emb.y + emb.height / 2; // Approximatif

    doc.setDrawColor(184, 134, 11);
    doc.setLineWidth(2);
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, 14, 'FD');

    doc.setFillColor(239, 68, 68);
    doc.rect(cx - 10, cy - 10, 20, 6.5, 'F');
    doc.setFillColor(34, 197, 94);
    doc.rect(cx - 10, cy + 3.5, 20, 6.5, 'F');

    doc.setFillColor(251, 191, 36);
    doc.circle(cx, cy, 4, 'F');
    
    // Draw border for fallback
    const fallbackBorder = getEffectiveBorder((emb as any).border, template.globalElementBorders);
    if (fallbackBorder) {
      drawElementBorder(doc, cx - 14, cy - 14, 28, 28, fallbackBorder, false);
    }
  }
}

// ============================================================================
// 4. EN-TÊTE
// ============================================================================

function drawHeader(doc: jsPDF, template: CertificateTemplate, isExport?: boolean): void {
  const hdr = template.header;

  applyTextStyle(doc, hdr.countryName.style!);
  processTextBorder(doc, hdr.countryName.text!, hdr.countryName.x, hdr.countryName.y, hdr.countryName.style?.align || 'center', hdr.countryName.border, template.globalElementBorders, isExport);
  doc.text(hdr.countryName.text!, hdr.countryName.x, hdr.countryName.y, { align: hdr.countryName.style?.align || 'center', baseline: 'middle' });

  applyTextStyle(doc, hdr.motto.style!);
  processTextBorder(doc, hdr.motto.text!, hdr.motto.x, hdr.motto.y, hdr.motto.style?.align || 'center', hdr.motto.border, template.globalElementBorders, isExport);
  doc.text(hdr.motto.text!, hdr.motto.x, hdr.motto.y, { align: hdr.motto.style?.align || 'center', baseline: 'middle' });

  const sep = hdr.separator;
  const sepRgb = hexToRgb(sep.lineColor);
  doc.setDrawColor(sepRgb.r, sepRgb.g, sepRgb.b);
  doc.setLineWidth(sep.lineWidth);
  doc.line(sep.x - sep.halfLength, sep.y, sep.x - sep.gap, sep.y);
  doc.line(sep.x + sep.gap, sep.y, sep.x + sep.halfLength, sep.y);

  const dotRgb = hexToRgb(sep.dotColor);
  doc.setFillColor(dotRgb.r, dotRgb.g, dotRgb.b);
  doc.circle(sep.x, sep.y, sep.dotRadius, 'F');
}

// ============================================================================
// 5. TITRE
// ============================================================================

function drawTitle(doc: jsPDF, template: CertificateTemplate, isExport?: boolean): void {
  const t = template.title;

  const tRgb = hexToRgb(t.color);
  doc.setTextColor(tRgb.r, tRgb.g, tRgb.b);
  doc.setFontSize(t.fontSize);
  doc.setFont('helvetica', 'bold');
  processTextBorder(doc, t.text, t.x, t.y, 'center', (t as any).border, template.globalElementBorders, isExport);
  doc.text(t.text, t.x, t.y, { align: 'center', baseline: 'middle' });

  const u = t.underline;
  const uRgb = hexToRgb(u.color);
  doc.setDrawColor(uRgb.r, uRgb.g, uRgb.b);
  
  doc.setLineWidth(u.width1);
  doc.line(t.x - u.length1, u.y, t.x + u.length1, u.y);
  
  doc.setLineWidth(u.width2);
  doc.line(t.x - u.length2, u.y + u.gap, t.x + u.length2, u.y + u.gap);
}

// ============================================================================
// 6. CORPS
// ============================================================================

function drawBody(doc: jsPDF, template: CertificateTemplate, data: RenderData, isExport?: boolean): void {
  const body = template.body;

  applyTextStyle(doc, body.prefixText.style!);
  processTextBorder(doc, body.prefixText.text!, body.prefixText.x, body.prefixText.y, body.prefixText.style?.align || 'center', body.prefixText.border, template.globalElementBorders, isExport);
  doc.text(body.prefixText.text!, body.prefixText.x, body.prefixText.y, { align: body.prefixText.style?.align || 'center', baseline: 'middle' });

  const cn = body.candidateName;
  const displayName = data.candidateName.toUpperCase();
  const cnRgb = hexToRgb(cn.color);
  doc.setTextColor(cnRgb.r, cnRgb.g, cnRgb.b);
  doc.setFont('helvetica', 'bold');

  fitText(doc, displayName, cn.maxWidth, cn.maxFontSize, cn.minFontSize);
  processTextBorder(doc, displayName, cn.x, cn.y, 'center', (cn as any).border, template.globalElementBorders, isExport);
  doc.text(displayName, cn.x, cn.y, { align: 'center', baseline: 'middle' });

  const nameWidth = Math.min(doc.getTextWidth(displayName), 140);
  const ulRgb = hexToRgb(cn.underlineColor);
  doc.setDrawColor(ulRgb.r, ulRgb.g, ulRgb.b);
  doc.setLineWidth(cn.underlineWidth);
  // Underline at y
  doc.line(cn.x - nameWidth / 2 - cn.underlinePadding, cn.y + 2, cn.x + nameWidth / 2 + cn.underlinePadding, cn.y + 2);

  applyTextStyle(doc, body.successText.style!);
  processTextBorder(doc, body.successText.text!, body.successText.x, body.successText.y, body.successText.style?.align || 'center', body.successText.border, template.globalElementBorders, isExport);
  doc.text(body.successText.text!, body.successText.x, body.successText.y, { align: body.successText.style?.align || 'center', baseline: 'middle' });

  applyTextStyle(doc, body.concoursName.style!);
  processTextBorder(doc, data.concoursName, body.concoursName.x, body.concoursName.y, body.concoursName.style?.align || 'center', body.concoursName.border, template.globalElementBorders, isExport);
  doc.text(data.concoursName, body.concoursName.x, body.concoursName.y, { align: body.concoursName.style?.align || 'center', baseline: 'middle' });
}

// ============================================================================
// 7. RÉSULTATS
// ============================================================================

function drawResults(doc: jsPDF, template: CertificateTemplate, data: RenderData): void {
  const r = template.results;
  const { width } = getPageDimensions(template);
  const boxW = r.width;
  const boxH = r.height;
  const totalW = boxW * 3 + r.gap * 2;
  const startX = (width - totalW) / 2;
  const y = r.y;

  const fillRgb = hexToRgb(r.fillColor);
  const borderRgb = hexToRgb(r.borderColor);
  const labelRgb = hexToRgb(r.labelColor);
  const valueRgb = hexToRgb(r.valueColor);

  // SCORE
  doc.setFillColor(fillRgb.r, fillRgb.g, fillRgb.b);
  doc.setDrawColor(borderRgb.r, borderRgb.g, borderRgb.b);
  doc.setLineWidth(1);
  doc.roundedRect(startX, y, boxW, boxH, r.cornerRadius, r.cornerRadius, 'FD');

  doc.setTextColor(labelRgb.r, labelRgb.g, labelRgb.b);
  doc.setFontSize(r.labelFontSize);
  doc.setFont('helvetica', 'bold');
  doc.text('SCORE', startX + boxW / 2, y + 5, { align: 'center', baseline: 'middle' });

  doc.setTextColor(valueRgb.r, valueRgb.g, valueRgb.b);
  doc.setFontSize(r.valueFontSize);
  doc.text(`${data.displayScore} / ${data.totalQuestions}`, startX + boxW / 2, y + 13, { align: 'center', baseline: 'middle' });

  // POURCENTAGE
  const box2X = startX + boxW + r.gap;
  doc.setFillColor(fillRgb.r, fillRgb.g, fillRgb.b);
  doc.setDrawColor(borderRgb.r, borderRgb.g, borderRgb.b);
  doc.roundedRect(box2X, y, boxW, boxH, r.cornerRadius, r.cornerRadius, 'FD');

  doc.setTextColor(labelRgb.r, labelRgb.g, labelRgb.b);
  doc.setFontSize(r.labelFontSize);
  doc.text('POURCENTAGE', box2X + boxW / 2, y + 5, { align: 'center', baseline: 'middle' });

  doc.setTextColor(valueRgb.r, valueRgb.g, valueRgb.b);
  doc.setFontSize(r.valueFontSize);
  doc.text(`${data.percentage}%`, box2X + boxW / 2, y + 13, { align: 'center', baseline: 'middle' });

  // MENTION
  const box3X = startX + (boxW + r.gap) * 2;
  const mentionBgRgb = hexToRgb(data.mentionInfo.bgColor);
  const mentionBorderRgb = hexToRgb(data.mentionInfo.borderColor);
  const mentionTextRgb = hexToRgb(data.mentionInfo.color);

  doc.setFillColor(mentionBgRgb.r, mentionBgRgb.g, mentionBgRgb.b);
  doc.setDrawColor(mentionBorderRgb.r, mentionBorderRgb.g, mentionBorderRgb.b);
  doc.setLineWidth(1.5);
  doc.roundedRect(box3X, y, boxW, boxH, r.cornerRadius, r.cornerRadius, 'FD');

  doc.setTextColor(labelRgb.r, labelRgb.g, labelRgb.b);
  doc.setFontSize(r.labelFontSize);
  doc.text('MENTION', box3X + boxW / 2, y + 5, { align: 'center' });

  doc.setTextColor(mentionTextRgb.r, mentionTextRgb.g, mentionTextRgb.b);
  doc.setFontSize(11);
  doc.text(data.mentionInfo.text, box3X + boxW / 2, y + 13, { align: 'center' });

  const border = getEffectiveBorder(r.elementBorder, template.globalElementBorders);
  if (border) {
    drawElementBorder(doc, startX, y, totalW, boxH, border, (arguments[3] as any)); // isExport pass-though via arguments or add isExport param
  }
}

// ============================================================================
// 8. DATE + SÉPARATEUR
// ============================================================================

function drawDate(doc: jsPDF, template: CertificateTemplate, data: RenderData, isExport?: boolean): void {
  const d = template.date;
  applyTextStyle(doc, d.style!);
  processTextBorder(doc, `Délivré le ${data.formattedDate}`, d.x, d.y, d.style?.align || 'center', d.border, template.globalElementBorders, isExport);
  doc.text(`Délivré le ${data.formattedDate}`, d.x, d.y, { align: d.style?.align || 'center' });

  const sep = template.footer.separator;
  const sepRgb = hexToRgb(sep.color);
  doc.setDrawColor(sepRgb.r, sepRgb.g, sepRgb.b);
  doc.setLineWidth(sep.width);
  const { width, margin } = getPageDimensions(template);
  doc.line(margin + sep.marginX, sep.y, width - margin - sep.marginX, sep.y);
}

// ============================================================================
// 9. FOOTER
// ============================================================================

function drawFooter(doc: jsPDF, template: CertificateTemplate, data: RenderData, isExport?: boolean): void {
  const ft = template.footer;

  // Signature
  applyTextStyle(doc, ft.signature.titleStyle);
  processTextBorder(doc, ft.signature.title, ft.signature.x, ft.signature.y, ft.signature.titleStyle?.align || 'center', (ft.signature as any).border, template.globalElementBorders, isExport);
  doc.text(ft.signature.title, ft.signature.x, ft.signature.y, { align: ft.signature.titleStyle?.align || 'center' });
  const sigLineRgb = hexToRgb(ft.signature.lineColor);
  doc.setDrawColor(sigLineRgb.r, sigLineRgb.g, sigLineRgb.b);
  doc.setLineWidth(ft.signature.lineWidth);
  doc.line(ft.signature.x - 30, ft.signature.y + 7, ft.signature.x + 30, ft.signature.y + 7);
  applyTextStyle(doc, ft.signature.nameStyle);
  processTextBorder(doc, ft.signature.name, ft.signature.x, ft.signature.y + 13, ft.signature.nameStyle?.align || 'center', (ft.signature as any).border, template.globalElementBorders, isExport);
  doc.text(ft.signature.name, ft.signature.x, ft.signature.y + 13, { align: ft.signature.nameStyle?.align || 'center' });

  // QR Code
  if (ft.qrCode.visible && data.qrCodeBase64) {
    const qrSize = ft.qrCode.size;
    const border = getEffectiveBorder((ft.qrCode as any).border, template.globalElementBorders);
    if (border) drawElementBorder(doc, ft.qrCode.x - qrSize/2, ft.qrCode.y - 5, qrSize, qrSize, border, isExport);
    // x, y is the top-center of the QR section or center
    doc.addImage(data.qrCodeBase64, 'PNG', ft.qrCode.x - qrSize / 2, ft.qrCode.y - 5, qrSize, qrSize);
  }
  applyTextStyle(doc, ft.qrCode.labelStyle);
  processTextBorder(doc, ft.qrCode.label, ft.qrCode.x, ft.qrCode.y + 19, ft.qrCode.labelStyle?.align || 'center', (ft.qrCode as any).border, template.globalElementBorders, isExport);
  doc.text(ft.qrCode.label, ft.qrCode.x, ft.qrCode.y + 19, { align: ft.qrCode.labelStyle?.align || 'center', baseline: 'middle' });

  // Certificat ID
  applyTextStyle(doc, ft.certificateId.labelStyle);
  processTextBorder(doc, ft.certificateId.label, ft.certificateId.x, ft.certificateId.y, ft.certificateId.labelStyle?.align || 'center', (ft.certificateId as any).border, template.globalElementBorders, isExport);
  doc.text(ft.certificateId.label, ft.certificateId.x, ft.certificateId.y, { align: ft.certificateId.labelStyle?.align || 'center', baseline: 'middle' });

  applyTextStyle(doc, ft.certificateId.valueStyle);
  processTextBorder(doc, data.certificateId, ft.certificateId.x, ft.certificateId.y + 7, ft.certificateId.valueStyle?.align || 'center', (ft.certificateId as any).border, template.globalElementBorders, isExport);
  doc.text(data.certificateId, ft.certificateId.x, ft.certificateId.y + 7, { align: ft.certificateId.valueStyle?.align || 'center', baseline: 'middle' });

  applyTextStyle(doc, ft.certificateId.urlStyle);
  const shortUrl = data.verificationUrl.replace('https://', '').replace('http://', '');
  const displayUrl = shortUrl.length > ft.certificateId.maxUrlLength
    ? shortUrl.substring(0, ft.certificateId.maxUrlLength) + '...'
    : shortUrl;
  processTextBorder(doc, displayUrl, ft.certificateId.x, ft.certificateId.y + 12, ft.certificateId.urlStyle?.align || 'center', (ft.certificateId as any).border, template.globalElementBorders, isExport);
  doc.text(displayUrl, ft.certificateId.x, ft.certificateId.y + 12, { align: ft.certificateId.urlStyle?.align || 'center', baseline: 'middle' });
}

// ============================================================================
// 10. ELÉMENTS PERSONNALISÉS (Textes & Images supplémentaires)
// ============================================================================

function drawCustomElements(doc: jsPDF, template: CertificateTemplate, isExport?: boolean): void {
  if (template.customImages) {
    for (const img of template.customImages) {
      if (img.src) {
        try {
          const border = getEffectiveBorder(img.border, template.globalElementBorders);
          if (border) drawElementBorder(doc, img.x, img.y, img.width, img.height, border, isExport);
          doc.addImage(img.src, 'PNG', img.x, img.y, img.width, img.height);
        } catch (e) {
          console.warn("Erreur dessin image custom:", e);
        }
      }
    }
  }

  if (template.customTexts) {
    for (const txt of template.customTexts) {
      if (txt.text) {
        const style = txt.style || { fontSize: txt.fontSize || 12, color: txt.color || '#000000' };
        applyTextStyle(doc, style);
        processTextBorder(doc, txt.text, txt.x, txt.y, style.align || 'center', txt.border, template.globalElementBorders, isExport);
        doc.text(txt.text, txt.x, txt.y, { align: style.align || 'center', baseline: 'middle' });
      }
    }
  }
}

// ============================================================================
// FONCTION PRINCIPALE : ASSEMBLAGE COMPLET
// ============================================================================

export function renderCertificate(doc: jsPDF, template: CertificateTemplate, data: RenderData, options?: { isExport?: boolean }): void {
  const isExp = options?.isExport;
  drawBackground(doc, template);
  drawBorders(doc, template);
  drawCustomElements(doc, template, isExp);
  drawEmblem(doc, template, data.emblemBase64);
  drawHeader(doc, template, isExp);
  drawTitle(doc, template, isExp);
  drawBody(doc, template, data, isExp);
  drawResults(doc, template, data); // Uses arguments hack for isExport
  drawDate(doc, template, data, isExp);
  drawFooter(doc, template, data, isExp);
}
