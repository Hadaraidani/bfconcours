import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  type CertificateTemplate,
  type CertificateData,
} from '../services/certificate';
import defaultTemplateJson from '../services/certificate/defaultTemplate.json';
import { generateCertificate } from '../services/certificate/certificateService';
import { usePdfPreview } from '../hooks/usePdfPreview';

// ============================================================================
// Constantes
// ============================================================================

const PAGE_WIDTH_MM = 297;
const PAGE_HEIGHT_MM = 210;
const SNAP_THRESHOLD_MM = 2; // distance en mm pour le snap
const GRID_STEP_MM = 10;    // espacement grille en mm

// ============================================================================
// Données de test
// ============================================================================

const MOCK_DATA_OPTIONS: Record<string, CertificateData> = {
  NORMAL: {
    candidateName: 'Thomas Sankara',
    concoursName: 'Concours Direct de la Fonction Publique 2026',
    score: 85, totalQuestions: 100,
    submissionDate: '15 Juillet 2026', rank: 1
  },
  LONG_NAME: {
    candidateName: 'Ouedraogo Tiemtore Jean-Baptiste Emmanuel Zongo',
    concoursName: 'Évaluation des Compétences Avancées',
    score: 65, totalQuestions: 100, submissionDate: '22 Août 2026',
  },
  PERFECT_SCORE: {
    candidateName: 'Amina Compaoré',
    concoursName: 'Concours Excellence ENA 2026',
    score: 100, totalQuestions: 100, submissionDate: '10 Septembre 2026',
  },
  LOW_SCORE: {
    candidateName: 'Issa Kaboré',
    concoursName: 'Test d\'Aptitude Générale',
    score: 51, totalQuestions: 100, submissionDate: '01 Novembre 2026',
  }
};

const BASE_ELEMENTS = [
  { id: 'emblem', label: 'Emblème (Logo)' },
  { id: 'header.countryName', label: 'Nom du Pays' },
  { id: 'header.motto', label: 'Devise' },
  { id: 'title', label: 'Titre Principal' },
  { id: 'body.prefixText', label: 'Texte Préfixe' },
  { id: 'body.candidateName', label: 'Nom du Candidat' },
  { id: 'body.successText', label: 'Texte Succès' },
  { id: 'body.concoursName', label: 'Nom du Concours' },
  { id: 'results', label: 'Boîtes de Résultats' },
  { id: 'date', label: 'Date de Délivrance' },
  { id: 'footer.signature', label: 'Signature' },
  { id: 'footer.qrCode', label: 'Code QR' },
  { id: 'footer.certificateId', label: 'ID Certificat' },
  { id: 'watermark', label: 'Filigrane (Texte)' }
];

// ============================================================================
// Snap / Guides helpers
// ============================================================================

interface GuideLine { axis: 'x' | 'y'; position: number; }

/** Lignes guides statiques : centre + marges */
function getStaticGuides(template: CertificateTemplate): GuideLine[] {
  const m = template.page.margin;
  return [
    { axis: 'x', position: PAGE_WIDTH_MM / 2 },   // centre H
    { axis: 'y', position: PAGE_HEIGHT_MM / 2 },   // centre V
    { axis: 'x', position: m },                     // marge gauche
    { axis: 'x', position: PAGE_WIDTH_MM - m },     // marge droite
    { axis: 'y', position: m },                     // marge haut
    { axis: 'y', position: PAGE_HEIGHT_MM - m },    // marge bas
    { axis: 'x', position: PAGE_WIDTH_MM / 4 },
    { axis: 'x', position: (PAGE_WIDTH_MM * 3) / 4 },
    { axis: 'y', position: PAGE_HEIGHT_MM / 3 },
    { axis: 'y', position: (PAGE_HEIGHT_MM * 2) / 3 },
  ];
}

/** Snappe les coordonnées vers les guides les plus proches */
function snapToGuides(
  x: number, y: number,
  guides: GuideLine[],
  threshold: number
): { x: number; y: number; activeGuides: GuideLine[] } {
  let snappedX = x;
  let snappedY = y;
  const activeGuides: GuideLine[] = [];

  for (const g of guides) {
    if (g.axis === 'x' && Math.abs(x - g.position) < threshold) {
      snappedX = g.position;
      activeGuides.push(g);
    }
    if (g.axis === 'y' && Math.abs(y - g.position) < threshold) {
      snappedY = g.position;
      activeGuides.push(g);
    }
  }

  return { x: snappedX, y: snappedY, activeGuides };
}

// ============================================================================
// Composant Principal
// ============================================================================

export default function TemplateEditor() {
  const [template, setTemplate] = useState<CertificateTemplate>(() => {
    const saved = localStorage.getItem('certificate_global_template');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.customTexts) parsed.customTexts = [];
        if (!parsed.customImages) parsed.customImages = [];
        if (!parsed.background) parsed.background = { visible: false };
        return parsed;
      } catch (e) {}
    }
    const def = JSON.parse(JSON.stringify(defaultTemplateJson));
    if (!def.customTexts) def.customTexts = [];
    if (!def.customImages) def.customImages = [];
    if (!def.background) def.background = { visible: false };
    return def;
  });

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'globals' | 'element' | 'layers'>('globals');
  const [mockDataType, setMockDataType] = useState<keyof typeof MOCK_DATA_OPTIONS>('NORMAL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState<number>(0.9);
  const [previewPdfUri, setPreviewPdfUri] = useState<string | null>(null);

  // ===== Nouvelles fonctionnalités =====
  const [showGrid, setShowGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [activeGuides, setActiveGuides] = useState<GuideLine[]>([]);

  // ===== Background drag state =====
  const [isDraggingBg, setIsDraggingBg] = useState(false);
  const bgDragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // Preview jsPDF fidèle
  const { imageUrl: previewImageUrl, isRendering, canvasWidth, canvasHeight, forceRender } =
    usePdfPreview(template, MOCK_DATA_OPTIONS[mockDataType]);

  const PX_PER_MM = canvasWidth / PAGE_WIDTH_MM;

  // Drag
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0, elemX: 0, elemY: 0 });

  const staticGuides = useMemo(() => getStaticGuides(template), [template.page.margin]);

  useEffect(() => {
    if (selectedElementId) setActiveSidebarTab('element');
  }, [selectedElementId]);

  // ============================================================================
  // Getters / Setters imbriqués
  // ============================================================================

  const getNestedValue = (obj: any, path: string) => {
    if (path.startsWith('customTexts[')) {
      const idx = parseInt(path.match(/\[(\d+)\]/)![1], 10);
      return obj.customTexts[idx];
    }
    if (path.startsWith('customImages[')) {
      const idx = parseInt(path.match(/\[(\d+)\]/)![1], 10);
      return obj.customImages[idx];
    }
    if (path === 'watermark') {
      return { ...obj.watermark, x: obj.watermark.startX, y: obj.watermark.startY };
    }
    return path.split('.').reduce((acc: any, part: string) => acc && acc[part], obj);
  };

  const updateNestedValue = (obj: any, path: string, updates: any) => {
    const newObj = JSON.parse(JSON.stringify(obj));
    if (path.startsWith('customTexts[')) {
      const idx = parseInt(path.match(/\[(\d+)\]/)![1], 10);
      Object.assign(newObj.customTexts[idx], updates);
      return newObj;
    }
    if (path.startsWith('customImages[')) {
      const idx = parseInt(path.match(/\[(\d+)\]/)![1], 10);
      Object.assign(newObj.customImages[idx], updates);
      return newObj;
    }
    if (path === 'watermark') {
      if (updates.x !== undefined) newObj.watermark.startX = updates.x;
      if (updates.y !== undefined) newObj.watermark.startY = updates.y;
      delete updates.x; delete updates.y;
      Object.assign(newObj.watermark, updates);
      return newObj;
    }
    const parts = path.split('.');
    let current = newObj;
    for (let i = 0; i < parts.length - 1; i++) current = current[parts[i]];
    const target = parts[parts.length - 1];
    Object.assign(current[target], updates);
    return newObj;
  };

  // ============================================================================
  // Conversion coordonnées écran → mm (via getBoundingClientRect)
  // ============================================================================

  /** Convertit des coordonnées écran (clientX/Y) en coordonnées mm du template */
  const screenToMm = (clientX: number, clientY: number): { xMm: number; yMm: number } | null => {
    if (!workspaceRef.current) return null;
    const rect = workspaceRef.current.getBoundingClientRect();
    // getBoundingClientRect inclut le scale CSS → on divise pour obtenir les px non-scalés
    const scaleX = rect.width / canvasWidth;
    const scaleY = rect.height / canvasHeight;
    const xPx = (clientX - rect.left) / scaleX;
    const yPx = (clientY - rect.top) / scaleY;
    return { xMm: xPx / PX_PER_MM, yMm: yPx / PX_PER_MM };
  };

  /** Trouve l'élément le plus proche d'une position en mm (hit detection par rectangle) */
  const findElementAtPosition = (xMm: number, yMm: number): string | null => {
    let best: { id: string; area: number } | null = null;

    for (const elem of dynamicElements) {
      const data = getNestedValue(template, elem.id);
      if (!data) continue;
      if (data.visible === false || data.fallbackVisible === false) continue;

      const rect = { left: 0, right: 0, top: 0, bottom: 0 };

      if (elem.id === 'results') {
        const r = template.results;
        rect.left = PAGE_WIDTH_MM / 2 - (r.width * 3 + r.gap * 2) / 2;
        rect.right = PAGE_WIDTH_MM / 2 + (r.width * 3 + r.gap * 2) / 2;
        rect.top = r.y;
        rect.bottom = r.y + r.height;
      } else if (elem.id === 'emblem') {
        rect.left = data.x - data.width / 2;
        rect.right = data.x + data.width / 2;
        rect.top = data.y;
        rect.bottom = data.y + data.height;
      } else if (elem.id.startsWith('customImages')) {
        rect.left = data.x;
        rect.right = data.x + data.width;
        rect.top = data.y;
        rect.bottom = data.y + data.height;
      } else if (elem.id === 'footer.signature') {
        rect.left = data.x - 40;
        rect.right = data.x + 40;
        rect.top = data.y - 4;
        rect.bottom = data.y + 16;
      } else if (elem.id === 'footer.qrCode') {
        rect.left = data.x - data.size / 2;
        rect.right = data.x + data.size / 2;
        rect.top = data.y - 5;
        rect.bottom = data.y - 5 + data.size + 25;
      } else if (elem.id === 'footer.certificateId') {
        rect.left = data.x - 20;
        rect.right = data.x + 20;
        rect.top = data.y - 5.4;
        rect.bottom = data.y + 12.6;
      } else if (elem.id === 'watermark') {
        rect.left = data.x - 100;
        rect.right = data.x + 100;
        rect.top = data.y - 40;
        rect.bottom = data.y + 40;
      } else {
        // Éléments texte génériques
        const fs = data.fontSize || data.style?.fontSize || 12;
        const txt = data.text || '';
        const wMm = Math.max(30, Math.min(250, txt.length * fs * 0.45));
        const align = data.style?.align || 'center';
        
        let cx = data.x;
        if (align === 'left') cx = data.x + wMm / 2;
        else if (align === 'right') cx = data.x - wMm / 2;

        rect.left = cx - wMm / 2;
        rect.right = cx + wMm / 2;
        rect.top = data.y - (fs * 1.8) / 2;
        rect.bottom = data.y + (fs * 1.8) / 2;
      }

      // Hit test avec 3mm de padding (tolérance de clic)
      const padding = 3;
      if (xMm >= rect.left - padding && xMm <= rect.right + padding &&
          yMm >= rect.top - padding && yMm <= rect.bottom + padding) {
        
        // Z-index heuristique : on sélectionne l'élément dont l'aire est la plus petite (ex: texte par-dessus filigrane)
        const area = (rect.right - rect.left) * (rect.bottom - rect.top);
        if (!best || area < best.area) {
          best = { id: elem.id, area };
        }
      }
    }
    return best?.id ?? null;
  };

  // ============================================================================
  // Pointer handlers au niveau workspace (plus de hit-test CSS)
  // ============================================================================

  const handleWorkspacePointerDown = (e: React.PointerEvent) => {
    const pos = screenToMm(e.clientX, e.clientY);
    if (!pos) { setSelectedElementId(null); return; }

    const hitId = findElementAtPosition(pos.xMm, pos.yMm);
    if (hitId) {
      e.stopPropagation();
      e.preventDefault();
      setSelectedElementId(hitId);

      const elemData = getNestedValue(template, hitId);
      if (elemData && typeof elemData.x === 'number') {
        setIsDragging(true);
        dragStartPos.current = { x: e.clientX, y: e.clientY, elemX: elemData.x, elemY: elemData.y };
        workspaceRef.current?.setPointerCapture(e.pointerId);
      }
    } else {
      setSelectedElementId(null);
      // Background drag: si une image de fond est active, commencer le drag du fond
      const bg = template.background;
      if (bg && bg.visible && bg.imageBase64) {
        e.stopPropagation();
        e.preventDefault();
        setIsDraggingBg(true);
        bgDragStart.current = {
          x: e.clientX, y: e.clientY,
          offsetX: bg.offsetX ?? 0, offsetY: bg.offsetY ?? 0
        };
        workspaceRef.current?.setPointerCapture(e.pointerId);
      }
    }
  };

  const handleWorkspacePointerMove = (e: React.PointerEvent) => {
    // Background drag
    if (isDraggingBg && workspaceRef.current) {
      const rect = workspaceRef.current.getBoundingClientRect();
      const mmPerScreenPx = PAGE_WIDTH_MM / rect.width;
      const dx = (e.clientX - bgDragStart.current.x) * mmPerScreenPx;
      const dy = (e.clientY - bgDragStart.current.y) * mmPerScreenPx;
      const newOffX = Math.round((bgDragStart.current.offsetX + dx) * 10) / 10;
      const newOffY = Math.round((bgDragStart.current.offsetY + dy) * 10) / 10;
      setTemplate(prev => ({ ...prev, background: { ...prev.background!, offsetX: newOffX, offsetY: newOffY } }));
      return;
    }

    if (!isDragging || !selectedElementId || !workspaceRef.current) return;
    // Utilise getBoundingClientRect pour une conversion précise incluant le zoom
    const rect = workspaceRef.current.getBoundingClientRect();
    const mmPerScreenPx = PAGE_WIDTH_MM / rect.width;

    const dx = (e.clientX - dragStartPos.current.x) * mmPerScreenPx;
    const dy = (e.clientY - dragStartPos.current.y) * mmPerScreenPx;

    let newX = Math.round((dragStartPos.current.elemX + dx) * 10) / 10;
    let newY = Math.round((dragStartPos.current.elemY + dy) * 10) / 10;

    if (snapEnabled) {
      const snap = snapToGuides(newX, newY, staticGuides, SNAP_THRESHOLD_MM);
      newX = snap.x; newY = snap.y;
      setActiveGuides(snap.activeGuides);
    }

    if (selectedElementId === 'results') {
      setTemplate(prev => updateNestedValue(prev, selectedElementId, { y: newY }));
    } else {
      setTemplate(prev => updateNestedValue(prev, selectedElementId, { x: newX, y: newY }));
    }
  };

  const handleWorkspacePointerUp = (e: React.PointerEvent) => {
    if (isDraggingBg) {
      setIsDraggingBg(false);
      setTimeout(forceRender, 50);
    }
    if (isDragging) {
      setIsDragging(false);
      setActiveGuides([]);
      setTimeout(forceRender, 50);
    }
    workspaceRef.current?.releasePointerCapture(e.pointerId);
  };

  /** Wheel zoom sur le background (mode custom uniquement) */
  const handleWorkspaceWheel = (e: React.WheelEvent) => {
    // Ne zoom le background que si aucun élément n'est sélectionné et que le fond est en mode custom
    if (selectedElementId) return;
    const bg = template.background;
    if (!bg || !bg.visible || !bg.imageBase64) return;
    if ((bg.size || 'cover') !== 'custom') return;

    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const currentZoom = bg.zoom ?? 1;
    const newZoom = Math.round(Math.max(0.1, Math.min(3, currentZoom + delta)) * 100) / 100;
    setTemplate(prev => ({ ...prev, background: { ...prev.background!, zoom: newZoom } }));
  };

  // ============================================================================
  // Actions Globales
  // ============================================================================

  const handleSave = () => {
    localStorage.setItem('certificate_global_template', JSON.stringify(template));
    alert("✅ Template Global sauvegardé avec succès !");
  };

  const handleGeneratePdf = async (download = false) => {
    setIsGenerating(true);
    try {
      const result = await generateCertificate(MOCK_DATA_OPTIONS[mockDataType], template, { returnBase64: !download, isExport: download });
      if (!download && result.dataUri) setPreviewPdfUri(result.dataUri);
    } catch (e) {
      alert("Erreur lors de la génération PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateBlank = () => {
    if (!window.confirm("Créer un nouveau modèle vide ? Vous perdrez les modifications non sauvegardées.")) return;
    const blank = JSON.parse(JSON.stringify(defaultTemplateJson)) as CertificateTemplate;
    blank.customTexts = []; blank.customImages = [];
    blank.background = { visible: false, color: '#FFFFFF' };
    blank.title.text = ""; blank.header.countryName.text = ""; blank.header.motto.text = "";
    blank.body.prefixText.text = ""; blank.body.successText.text = "";
    blank.emblem.fallbackVisible = false; blank.watermark.visible = false; blank.date.text = "";
    setTemplate(blank); setSelectedElementId(null);
  };

  const handleResetDefault = () => {
    if (!window.confirm("Restaurer le modèle original ? Vous perdrez toutes vos personnalisations.")) return;
    const def = JSON.parse(JSON.stringify(defaultTemplateJson)) as CertificateTemplate;
    def.customTexts = []; def.customImages = []; def.background = { visible: false };
    setTemplate(def); setSelectedElementId(null);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `template_${template.name || 'certificat'}_${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as CertificateTemplate;
        if (!imported.page || !imported.borders) { alert("❌ Fichier JSON invalide."); return; }
        if (!imported.customTexts) imported.customTexts = [];
        if (!imported.customImages) imported.customImages = [];
        if (!imported.background) imported.background = { visible: false };
        setTemplate(imported); setSelectedElementId(null);
        alert("✅ Template importé avec succès !");
      } catch { alert("❌ Fichier JSON invalide."); }
    };
    reader.readAsText(file);
  };

  // ============================================================================
  // Custom elements
  // ============================================================================

  const handleAddText = () => {
    const newText = {
      id: `custom_txt_${Date.now()}`, x: 148.5, y: 105,
      text: "Nouveau texte", fontSize: 14, color: "#000000",
      fontFamily: "helvetica", visible: true
    };
    setTemplate(prev => ({ ...prev, customTexts: [...(prev.customTexts || []), newText] }));
    setSelectedElementId(`customTexts[${(template.customTexts || []).length}]`);
  };

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newImg = { id: `custom_img_${Date.now()}`, x: 148.5, y: 105, width: 30, height: 30, src: base64 };
      setTemplate(prev => ({ ...prev, customImages: [...(prev.customImages || []), newImg] }));
      setSelectedElementId(`customImages[${(template.customImages || []).length}]`);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteElement = () => {
    if (!selectedElementId) return;
    if (selectedElementId.startsWith('customTexts')) {
      const idx = parseInt(selectedElementId.match(/\[(\d+)\]/)![1], 10);
      setTemplate(prev => { const arr = [...(prev.customTexts || [])]; arr.splice(idx, 1); return { ...prev, customTexts: arr }; });
      setSelectedElementId(null);
    } else if (selectedElementId.startsWith('customImages')) {
      const idx = parseInt(selectedElementId.match(/\[(\d+)\]/)![1], 10);
      setTemplate(prev => { const arr = [...(prev.customImages || [])]; arr.splice(idx, 1); return { ...prev, customImages: arr }; });
      setSelectedElementId(null);
    }
  };

  // ============================================================================
  // Liste dynamique
  // ============================================================================

  const dynamicElements = [
    ...BASE_ELEMENTS,
    ...(template.customTexts || []).map((t, i) => ({ id: `customTexts[${i}]`, label: `[T] ${t.text?.substring(0, 12) || 'texte'}` })),
    ...(template.customImages || []).map((_img, i) => ({ id: `customImages[${i}]`, label: `[IMG] Image perso ${i + 1}` }))
  ];

  const selectedData = selectedElementId ? getNestedValue(template, selectedElementId) : null;
  const isCustomElement = selectedElementId?.startsWith('custom');

  // ============================================================================
  // Overlay hitboxes
  // ============================================================================

  function getOverlayStyle(elemId: string, data: any): React.CSSProperties | null {
    if (!data) return null;
    if (data.visible === false || data.fallbackVisible === false) return null;
    if (elemId === 'results') {
      const r = template.results;
      return { left: '50%', top: `${r.y * PX_PER_MM}px`, width: `${(r.width * 3 + r.gap * 2) * PX_PER_MM}px`, height: `${r.height * PX_PER_MM}px`, transform: 'translateX(-50%)' };
    }
    if (elemId === 'watermark') return { left: `${data.x * PX_PER_MM}px`, top: `${data.y * PX_PER_MM}px`, width: '200px', height: '80px', transform: 'translate(-50%, -50%)' };
    if (elemId === 'emblem') return { left: `${(data.x - data.width / 2) * PX_PER_MM}px`, top: `${data.y * PX_PER_MM}px`, width: `${data.width * PX_PER_MM}px`, height: `${data.height * PX_PER_MM}px` };
    if (elemId.startsWith('customImages')) return { left: `${data.x * PX_PER_MM}px`, top: `${data.y * PX_PER_MM}px`, width: `${data.width * PX_PER_MM}px`, height: `${data.height * PX_PER_MM}px` };
    if (elemId === 'footer.signature') return { left: `${data.x * PX_PER_MM}px`, top: `${data.y * PX_PER_MM}px`, width: `${80 * PX_PER_MM}px`, height: `${20 * PX_PER_MM}px`, transform: 'translate(-50%, -20%)' };
    if (elemId === 'footer.qrCode') { const s = data.size * PX_PER_MM; return { left: `${data.x * PX_PER_MM}px`, top: `${(data.y - 5) * PX_PER_MM}px`, width: `${s}px`, height: `${s + 25}px`, transform: 'translateX(-50%)' }; }
    if (elemId === 'footer.certificateId') return { left: `${data.x * PX_PER_MM}px`, top: `${data.y * PX_PER_MM}px`, width: `${40 * PX_PER_MM}px`, height: `${18 * PX_PER_MM}px`, transform: 'translate(-50%, -30%)' };
    const fs = data.fontSize || data.style?.fontSize || 12;
    const txt = data.text || '';
    const wMm = Math.max(30, Math.min(250, txt.length * fs * 0.45));
    const align = data.style?.align || 'center';
    
    let cx = data.x;
    if (align === 'left') cx = data.x + wMm / 2;
    else if (align === 'right') cx = data.x - wMm / 2;

    return { left: `${cx * PX_PER_MM}px`, top: `${data.y * PX_PER_MM}px`, width: `${wMm * PX_PER_MM}px`, height: `${fs * 1.8 * PX_PER_MM}px`, transform: 'translate(-50%, -50%)' };
  }

  // ============================================================================
  // RENDU MÉTADONNÉES BORDURE
  // ============================================================================
  const renderBorderSettings = (
    borderData: any, // ElementBorder | undefined
    onChange: (updates: any) => void,
    title: string = "Bordure"
  ) => {
    const isEnabled = borderData?.visible ?? false;
    const border = borderData || { width: 1, color: '#000000', style: 'solid', opacity: 1, radius: 0, padding: 2, exportVisible: true };

    return (
      <div className="space-y-3 p-3 bg-gradient-to-b from-indigo-50 to-white border border-indigo-200 rounded-lg mt-3">
        <div className="flex justify-between items-center">
          <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{title}</h4>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-gray-500 uppercase">Actif</label>
            <input type="checkbox" checked={isEnabled}
              onChange={(e) => onChange({ ...border, visible: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500" />
          </div>
        </div>

        {isEnabled && (
          <div className="space-y-3 pt-2 border-t border-indigo-100">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={border.exportVisible ?? true}
                onChange={(e) => onChange({ ...border, exportVisible: e.target.checked })}
                className="rounded text-gray-500 focus:ring-gray-400" id={`exp_${title}`} />
              <label htmlFor={`exp_${title}`} className="text-[10px] text-gray-600">Visible à l'export final</label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Épaisseur</label>
                <input type="number" min="0" step="0.5" value={border.width}
                  onChange={(e) => onChange({ ...border, width: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs border-gray-300 rounded" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Couleur</label>
                <div className="flex items-center gap-1">
                  <input type="color" value={border.color}
                    onChange={(e) => onChange({ ...border, color: e.target.value })}
                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer" />
                  <span className="text-[10px] font-mono text-gray-500">{border.color}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Style</label>
              <select className="w-full text-xs border-gray-300 rounded bg-white"
                value={border.style} onChange={(e) => onChange({ ...border, style: e.target.value })}>
                <option value="solid">Solide</option>
                <option value="dashed">Tirets</option>
                <option value="dotted">Pointillés</option>
                <option value="double">Double</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Rayon (Arrondi)</label>
                <input type="number" min="0" step="1" value={border.radius}
                  onChange={(e) => onChange({ ...border, radius: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs border-gray-300 rounded" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Espacement</label>
                <input type="number" min="0" step="0.5" value={border.padding ?? 2}
                  onChange={(e) => onChange({ ...border, padding: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs border-gray-300 rounded" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Opacité</label>
                <span className="text-[10px] text-gray-500">{Math.round((border.opacity ?? 1) * 100)}%</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" value={border.opacity ?? 1}
                onChange={(e) => onChange({ ...border, opacity: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500" />
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDU
  // ============================================================================

  return (
    <div className="flex h-full bg-gray-200 font-sans overflow-hidden">

      {/* ================================================================ */}
      {/* SIDEBAR */}
      {/* ================================================================ */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10 flex-shrink-0">

        {/* Tabs */}
        <div className="flex bg-gray-100 border-b border-gray-200">
          {([['globals', '⚙️ Paramètres'], ['element', '🎨 Édition'], ['layers', '📋 Calques']] as const).map(([key, label]) => (
            <button key={key}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wide ${activeSidebarTab === key ? 'bg-white text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setActiveSidebarTab(key); if (key === 'globals') setSelectedElementId(null); }}
            >{label}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* =================== TAB: PARAMÈTRES GLOBAUX =================== */}
          {activeSidebarTab === 'globals' && (
            <div className="space-y-5">
              {/* Éléments Libres */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Éléments Libres</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleAddText} className="px-2 py-2 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 transition">➕ Texte</button>
                  <label className="px-2 py-2 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 text-center cursor-pointer transition">
                    ➕ Image<input type="file" accept="image/*" className="hidden" onChange={handleAddImage} />
                  </label>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* ===== PANNEAU ARRIÈRE-PLAN AVANCÉ ===== */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider flex items-center gap-1.5">🖼️ Arrière-Plan</h3>

                {/* Couleur de fond */}
                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-600 whitespace-nowrap">Couleur fond :</label>
                  <input type="color" value={template.background?.color || '#FFFFFF'}
                    onChange={(e) => setTemplate(p => ({ ...p, background: { ...p.background!, visible: p.background?.visible ?? false, color: e.target.value } }))}
                    className="w-10 h-7 p-0 border border-gray-300 rounded cursor-pointer" />
                  <span className="text-[10px] font-mono text-gray-400">{template.background?.color || '#FFFFFF'}</span>
                </div>

                {/* Image de fond */}
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Image de fond :</label>
                  <label className="block w-full text-center py-2 bg-emerald-50 hover:bg-emerald-100 text-xs font-medium text-emerald-700 rounded border border-emerald-200 cursor-pointer transition">
                    {template.background?.imageBase64 ? '🔄 Remplacer l\'image' : '➕ Ajouter une image'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const r = new FileReader();
                      r.onload = (ev) => setTemplate(p => ({ ...p, background: { ...p.background, visible: true, imageBase64: ev.target?.result as string, opacity: p.background?.opacity ?? 1, size: p.background?.size || 'cover', position: p.background?.position || 'center', repeat: p.background?.repeat || 'no-repeat', zoom: p.background?.zoom ?? 1, offsetX: 0, offsetY: 0 } }));
                      r.readAsDataURL(file);
                    }} />
                  </label>
                  {template.background?.imageBase64 && (
                    <button onClick={() => setTemplate(p => ({ ...p, background: { ...p.background, visible: false, imageBase64: '' } }))} className="mt-1.5 w-full text-center py-1.5 text-red-600 text-xs font-medium bg-red-50 hover:bg-red-100 rounded border border-red-200 transition">
                      🗑️ Retirer l'image
                    </button>
                  )}
                </div>

                {/* Contrôles avancés (visibles si image présente) */}
                {template.background?.imageBase64 && (
                  <div className="space-y-3 p-3 bg-gradient-to-b from-indigo-50 to-white border border-indigo-200 rounded-lg">
                    <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Réglages Image</h4>

                    {/* Opacité */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Opacité</label>
                        <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {Math.round((template.background!.opacity ?? 1) * 100)}%
                        </span>
                      </div>
                      <input type="range" min="0" max="100" step="1"
                        value={Math.round((template.background!.opacity ?? 1) * 100)}
                        onChange={(e) => setTemplate(p => ({ ...p, background: { ...p.background!, opacity: parseInt(e.target.value) / 100 } }))}
                        className="w-full accent-indigo-500" />
                    </div>

                    {/* Mode de taille */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Mode de taille</label>
                      <div className="flex gap-1">
                        {(['cover', 'contain', 'custom'] as const).map(mode => (
                          <button key={mode}
                            onClick={() => setTemplate(p => ({ ...p, background: { ...p.background!, size: mode } }))}
                            className={`flex-1 py-1.5 text-xs rounded border transition capitalize ${(template.background!.size || 'cover') === mode
                              ? 'bg-indigo-100 border-indigo-400 text-indigo-700 font-bold'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}>
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Zoom (uniquement en mode custom) */}
                    {(template.background!.size || 'cover') === 'custom' && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Zoom</label>
                          <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {Math.round((template.background!.zoom ?? 1) * 100)}%
                          </span>
                        </div>
                        <input type="range" min="10" max="300" step="1"
                          value={Math.round((template.background!.zoom ?? 1) * 100)}
                          onChange={(e) => setTemplate(p => ({ ...p, background: { ...p.background!, zoom: parseInt(e.target.value) / 100 } }))}
                          className="w-full accent-indigo-500" />
                      </div>
                    )}

                    {/* Position */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Position</label>
                      <select className="w-full text-xs border-gray-300 rounded bg-white"
                        value={template.background!.position || 'center'}
                        onChange={(e) => setTemplate(p => ({ ...p, background: { ...p.background!, position: e.target.value as any } }))}>
                        <option value="center">Centre</option>
                        <option value="top left">Haut Gauche</option>
                        <option value="top center">Haut Centre</option>
                        <option value="top right">Haut Droite</option>
                        <option value="center left">Centre Gauche</option>
                        <option value="center right">Centre Droite</option>
                        <option value="bottom left">Bas Gauche</option>
                        <option value="bottom center">Bas Centre</option>
                        <option value="bottom right">Bas Droite</option>
                      </select>
                    </div>

                    {/* Répétition */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Répétition</label>
                      <div className="flex gap-1">
                        {(['no-repeat', 'repeat'] as const).map(r => (
                          <button key={r}
                            onClick={() => setTemplate(p => ({ ...p, background: { ...p.background!, repeat: r } }))}
                            className={`flex-1 py-1.5 text-xs rounded border transition ${(template.background!.repeat || 'no-repeat') === r
                              ? 'bg-indigo-100 border-indigo-400 text-indigo-700 font-bold'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}>
                            {r === 'no-repeat' ? 'Aucune' : 'Répéter'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Offsets (drag) */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Offset X (mm)</label>
                        <input type="number" step="0.5" value={template.background!.offsetX ?? 0}
                          onChange={(e) => setTemplate(p => ({ ...p, background: { ...p.background!, offsetX: parseFloat(e.target.value) || 0 } }))}
                          className="mt-1 w-full text-xs border-gray-300 rounded" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Offset Y (mm)</label>
                        <input type="number" step="0.5" value={template.background!.offsetY ?? 0}
                          onChange={(e) => setTemplate(p => ({ ...p, background: { ...p.background!, offsetY: parseFloat(e.target.value) || 0 } }))}
                          className="mt-1 w-full text-xs border-gray-300 rounded" />
                      </div>
                    </div>

                    {/* Reset réglages background */}
                    <button onClick={() => setTemplate(p => ({ ...p, background: { ...p.background!, opacity: 1, size: 'cover', position: 'center', repeat: 'no-repeat', zoom: 1, offsetX: 0, offsetY: 0 } }))}
                      className="w-full py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 transition">
                      ↩️ Réinitialiser les réglages
                    </button>

                    <p className="text-[9px] text-gray-400 italic">💡 En mode "custom" : glissez le fond ou utilisez la molette pour zoomer.</p>
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Bordures Collectives */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Bordures Mode Collectif</h3>
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={template.globalElementBorders?.enabled ?? false}
                    onChange={(e) => setTemplate(p => ({ ...p, globalElementBorders: { ...p.globalElementBorders, enabled: e.target.checked, border: p.globalElementBorders?.border || { visible: true, exportVisible: true, width: 1, color: '#000000', style: 'solid', opacity: 1, radius: 0, padding: 2 } } }))}
                    id="global_border_toggle" className="rounded text-indigo-600 focus:ring-indigo-500" />
                  <label htmlFor="global_border_toggle" className="text-xs font-medium text-gray-700">Appliquer à tous les éléments</label>
                </div>
                {template.globalElementBorders?.enabled && renderBorderSettings(
                  template.globalElementBorders.border,
                  (newBorder) => setTemplate(p => ({ ...p, globalElementBorders: { ...p.globalElementBorders!, border: newBorder } })),
                  "Bordure Collective"
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Bordures PDF Existantes */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Bordures PDF</h3>
                <div className="space-y-3">
                  {['outer', 'middle', 'inner'].map((borderKey) => (
                    <div key={borderKey} className="bg-gray-50 p-2 rounded border border-gray-100">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{borderKey}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-xs text-gray-600 block">Épaisseur</span>
                          <input type="number" step="0.5" value={(template.borders as any)[borderKey].width}
                            onChange={(e) => setTemplate(prev => updateNestedValue(prev, `borders.${borderKey}`, { width: parseFloat(e.target.value) }))}
                            className="w-full text-xs border-gray-300 rounded" />
                        </div>
                        <div>
                          <span className="text-xs text-gray-600 block">Couleur</span>
                          <input type="color" value={(template.borders as any)[borderKey].color}
                            onChange={(e) => setTemplate(prev => updateNestedValue(prev, `borders.${borderKey}`, { color: e.target.value }))}
                            className="w-full h-7 p-0 border-0 rounded cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Import / Export */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Import / Export</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleExportJson} className="px-2 py-2 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition">
                    📤 Exporter JSON
                  </button>
                  <label className="px-2 py-2 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 text-center cursor-pointer transition">
                    📥 Importer<input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
                  </label>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Simulation Data */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Simulation Data</h3>
                <select className="w-full text-sm border-gray-300 rounded-md shadow-sm bg-gray-50"
                  value={mockDataType} onChange={(e) => setMockDataType(e.target.value as any)}>
                  <option value="NORMAL">Candidat Normal</option>
                  <option value="LONG_NAME">Nom Très Long</option>
                  <option value="PERFECT_SCORE">Score Parfait</option>
                  <option value="LOW_SCORE">Score Bas</option>
                </select>
              </div>
            </div>
          )}

          {/* =================== TAB: ÉDITION ÉLÉMENT =================== */}
          {activeSidebarTab === 'element' && (
            <div className="space-y-4">
              {!selectedElementId ? (
                <div className="text-sm text-gray-400 italic text-center py-6">
                  Cliquez sur un élément du canevas pour le modifier.
                </div>
              ) : (
                <>
                  {/* Nom + Supprimer */}
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 break-words flex-1">
                      {dynamicElements.find(e => e.id === selectedElementId)?.label || selectedElementId}
                    </h3>
                    {isCustomElement && (
                      <button onClick={handleDeleteElement} className="ml-2 text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded" title="Supprimer">🗑️</button>
                    )}
                  </div>

                  {/* Position */}
                  <div className="grid grid-cols-2 gap-3 bg-blue-50 p-3 rounded border border-blue-100">
                    {selectedElementId !== 'results' && (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">X (mm)</label>
                        <input type="number" step="0.5" value={selectedData?.x || 0}
                          onChange={(e) => setTemplate(updateNestedValue(template, selectedElementId, { x: parseFloat(e.target.value) }))}
                          className="mt-1 w-full text-sm border-gray-300 rounded" />
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Y (mm)</label>
                      <input type="number" step="0.5" value={selectedData?.y || 0}
                        onChange={(e) => setTemplate(updateNestedValue(template, selectedElementId, { y: parseFloat(e.target.value) }))}
                        className="mt-1 w-full text-sm border-gray-300 rounded" />
                    </div>
                  </div>

                  {/* Image source */}
                  {(selectedElementId === 'emblem' || selectedElementId.startsWith('customImages')) && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Source Image</label>
                      <label className="block w-full text-center py-2 bg-gray-100 hover:bg-gray-200 text-xs rounded border border-gray-300 cursor-pointer">
                        📂 Importer et Remplacer...
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          const r = new FileReader();
                          r.onload = (ev) => setTemplate(updateNestedValue(template, selectedElementId, { src: ev.target?.result as string }));
                          r.readAsDataURL(file);
                        }} />
                      </label>
                    </div>
                  )}

                  {/* Dimensions */}
                  {(selectedData?.width !== undefined && selectedData?.height !== undefined) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Largeur (mm)</label>
                        <input type="number" value={selectedData.width}
                          onChange={(e) => setTemplate(updateNestedValue(template, selectedElementId, { width: parseFloat(e.target.value) }))}
                          className="w-full text-sm border-gray-300 rounded" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Hauteur (mm)</label>
                        <input type="number" value={selectedData.height}
                          onChange={(e) => setTemplate(updateNestedValue(template, selectedElementId, { height: parseFloat(e.target.value) }))}
                          className="w-full text-sm border-gray-300 rounded" />
                      </div>
                    </div>
                  )}

                  {/* Texte */}
                  {selectedData?.text !== undefined && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Texte</label>
                      {selectedElementId === 'watermark' ? (
                        <textarea rows={2} value={selectedData.text}
                          onChange={(e) => setTemplate(updateNestedValue(template, selectedElementId, { text: e.target.value }))}
                          className="w-full text-sm border-gray-300 rounded" />
                      ) : (
                        <input type="text" value={selectedData.text}
                          onChange={(e) => setTemplate(updateNestedValue(template, selectedElementId, { text: e.target.value }))}
                          className="w-full text-sm border-gray-300 rounded" />
                      )}
                    </div>
                  )}

                  {/* ===== PANNEAU TYPOGRAPHIE ENRICHI ===== */}
                  {(selectedData?.fontSize !== undefined || selectedData?.style?.fontSize !== undefined) && (
                    <div className="space-y-3 p-3 bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-lg">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Typographie</h4>

                      {/* Taille avec slider */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Taille (pt)</label>
                          <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {selectedData?.fontSize || selectedData?.style?.fontSize || 12}
                          </span>
                        </div>
                        <input type="range" min="5" max="80" step="1"
                          value={selectedData?.fontSize || selectedData?.style?.fontSize || 12}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (selectedData.style) setTemplate(updateNestedValue(template, selectedElementId, { style: { ...selectedData.style, fontSize: val } }));
                            else setTemplate(updateNestedValue(template, selectedElementId, { fontSize: val }));
                          }}
                          className="w-full accent-emerald-500" />
                      </div>

                      {/* Police */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Police</label>
                        <select className="w-full text-sm border-gray-300 rounded"
                          value={selectedData?.fontFamily || selectedData?.style?.fontFamily || 'helvetica'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (selectedData.style) setTemplate(updateNestedValue(template, selectedElementId, { style: { ...selectedData.style, fontFamily: val } }));
                            else setTemplate(updateNestedValue(template, selectedElementId, { fontFamily: val }));
                          }}>
                          <option value="helvetica">Helvetica (Sans-Serif)</option>
                          <option value="times">Times (Serif)</option>
                          <option value="courier">Courier (Mono)</option>
                        </select>
                      </div>

                      {/* Style gras / italique */}
                      {selectedData?.style && (
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Style</label>
                          <div className="flex gap-1">
                            {(['normal', 'bold', 'italic', 'bolditalic'] as const).map(st => (
                              <button key={st}
                                onClick={() => setTemplate(updateNestedValue(template, selectedElementId, { style: { ...selectedData.style, fontStyle: st } }))}
                                className={`flex-1 py-1.5 text-xs rounded border transition ${selectedData.style.fontStyle === st
                                  ? 'bg-emerald-100 border-emerald-400 text-emerald-700 font-bold'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                  }`}>
                                {st === 'normal' ? 'Normal' : st === 'bold' ? 'B' : st === 'italic' ? 'I' : 'B+I'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Alignement */}
                      {selectedData?.style?.align !== undefined && (
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Alignement</label>
                          <div className="flex gap-1">
                            {(['left', 'center', 'right'] as const).map(al => (
                              <button key={al}
                                onClick={() => setTemplate(updateNestedValue(template, selectedElementId, { style: { ...selectedData.style, align: al } }))}
                                className={`flex-1 py-1.5 text-xs rounded border transition ${selectedData.style.align === al
                                  ? 'bg-emerald-100 border-emerald-400 text-emerald-700 font-bold'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                  }`}>
                                {al === 'left' ? '◀ Gauche' : al === 'center' ? '▬ Centre' : 'Droite ▶'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Couleur */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Couleur</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={selectedData?.color || selectedData?.style?.color || '#000000'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (selectedData.style) setTemplate(updateNestedValue(template, selectedElementId, { style: { ...selectedData.style, color: val } }));
                              else setTemplate(updateNestedValue(template, selectedElementId, { color: val }));
                            }}
                            className="w-8 h-8 p-0 border-0 rounded cursor-pointer" />
                          <span className="text-[10px] font-mono text-gray-400">{selectedData?.color || selectedData?.style?.color || '#000000'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Visibilité PDF */}
                  {(selectedData?.visible !== undefined || selectedData?.fallbackVisible !== undefined) && !isCustomElement && (
                    <div className="flex items-center gap-2 mt-3">
                      <input type="checkbox"
                        checked={selectedData.visible ?? selectedData.fallbackVisible}
                        onChange={(e) => {
                          const val = e.target.checked;
                          if (selectedData.visible !== undefined) setTemplate(updateNestedValue(template, selectedElementId, { visible: val }));
                          if (selectedData.fallbackVisible !== undefined) setTemplate(updateNestedValue(template, selectedElementId, { fallbackVisible: val }));
                        }}
                        id="visible_toggle" className="rounded text-emerald-600 focus:ring-emerald-500" />
                      <label htmlFor="visible_toggle" className="text-sm font-medium text-gray-700">Visible sur le PDF</label>
                    </div>
                  )}

                  {/* ===== PANNEAU BORDURE ÉLÉMENT ===== */}
                  {selectedElementId === 'results' ? renderBorderSettings(
                    selectedData?.elementBorder,
                    (newBorder) => setTemplate(updateNestedValue(template, selectedElementId, { elementBorder: newBorder })),
                    "Bordure Boîte Résultats"
                  ) : renderBorderSettings(
                    selectedData?.border,
                    (newBorder) => setTemplate(updateNestedValue(template, selectedElementId, { border: newBorder })),
                    "Bordure de l'élément"
                  )}
                </>
              )}
            </div>
          )}

          {/* =================== TAB: CALQUES (Liste des éléments) =================== */}
          {activeSidebarTab === 'layers' && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Tous les éléments</h3>
              {dynamicElements.map(elem => {
                const data = getNestedValue(template, elem.id);
                const isHidden = data?.visible === false || data?.fallbackVisible === false;
                const isSelected = selectedElementId === elem.id;
                return (
                  <button key={elem.id}
                    onClick={() => { setSelectedElementId(elem.id); setActiveSidebarTab('element'); }}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition flex items-center justify-between group
                      ${isSelected
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'hover:bg-gray-100 text-gray-700 border border-transparent'
                      }`}>
                    <span className={`flex-1 truncate ${isHidden ? 'line-through opacity-50' : ''}`}>
                      {elem.label}
                    </span>
                    {data?.y !== undefined && (
                      <span className="text-[9px] font-mono text-gray-400 ml-2">
                        {Math.round(data.x || 0)},{Math.round(data.y)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions bas de sidebar */}
        <div className="p-3 bg-gray-50 grid grid-cols-2 gap-2 border-t flex-shrink-0">
          <button onClick={() => handleGeneratePdf(false)} disabled={isGenerating}
            className="col-span-1 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded transition flex items-center justify-center gap-1">
            {isGenerating ? '⏳' : '👁️'} Aperçu
          </button>
          <button onClick={() => handleGeneratePdf(true)} disabled={isGenerating}
            className="col-span-1 py-2.5 text-xs font-bold text-emerald-700 bg-white border border-emerald-300 hover:bg-gray-50 rounded transition flex items-center justify-center gap-1">
            {isGenerating ? '⏳' : '⬇️'} PDF
          </button>
          <button onClick={handleSave}
            className="col-span-2 py-2.5 bg-emerald-600 text-white rounded font-bold text-sm shadow hover:bg-emerald-700 transition">
            💾 Sauvegarder
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* WORKSPACE */}
      {/* ================================================================ */}
      <div className="flex-1 flex flex-col bg-gray-600 relative overflow-hidden">

        {/* Top Bar */}
        <div className="bg-gray-800 text-gray-300 px-4 py-2 flex justify-between items-center shadow-md z-30">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-widest text-gray-500">Éditeur</span>
            <div className="w-px h-4 bg-gray-600"></div>
            <button onClick={handleCreateBlank} className="text-[11px] hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition">📄 Vide</button>
            <button onClick={handleResetDefault} className="text-[11px] hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition">🔄 Original</button>
            <div className="w-px h-4 bg-gray-600"></div>

            {/* Grille */}
            <button onClick={() => setShowGrid(g => !g)}
              className={`text-[11px] px-2 py-1 rounded transition ${showGrid ? 'bg-emerald-600/30 text-emerald-300' : 'hover:text-white hover:bg-gray-700'}`}>
              {showGrid ? '▦ Grille ON' : '▦ Grille'}
            </button>

            {/* Guides */}
            <button onClick={() => setShowGuides(g => !g)}
              className={`text-[11px] px-2 py-1 rounded transition ${showGuides ? 'bg-blue-600/30 text-blue-300' : 'hover:text-white hover:bg-gray-700'}`}>
              {showGuides ? '⊞ Guides ON' : '⊞ Guides'}
            </button>

            {/* Snap */}
            <button onClick={() => setSnapEnabled(s => !s)}
              className={`text-[11px] px-2 py-1 rounded transition ${snapEnabled ? 'bg-purple-600/30 text-purple-300' : 'hover:text-white hover:bg-gray-700'}`}>
              {snapEnabled ? '🧲 Snap ON' : '🧲 Snap'}
            </button>

            {isRendering && <span className="text-[10px] text-amber-400 animate-pulse ml-2">⏳ Rendu...</span>}
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2 bg-gray-900 px-3 py-1 rounded">
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="w-5 h-5 flex items-center justify-center hover:bg-gray-700 rounded text-sm">−</button>
            <input type="range" min="0.3" max="2" step="0.1" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="w-20 accent-emerald-500" />
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="w-5 h-5 flex items-center justify-center hover:bg-gray-700 rounded text-sm">+</button>
            <span className="text-xs font-mono w-10">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-8 relative">
          <div
            ref={workspaceRef}
            className="shadow-2xl bg-white origin-top relative cursor-crosshair"
            style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px`, transform: `scale(${zoom})`, minHeight: `${canvasHeight}px` }}
            onPointerDown={handleWorkspacePointerDown}
            onPointerMove={handleWorkspacePointerMove}
            onPointerUp={handleWorkspacePointerUp}
            onWheel={handleWorkspaceWheel}
          >

            {/* Preview jsPDF fidèle */}
            {previewImageUrl && (
              <img src={previewImageUrl} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} draggable={false} alt="Aperçu" />
            )}
            {!previewImageUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                <div className="animate-spin text-2xl mb-2">⏳</div>
                <span className="text-sm">Génération de l'aperçu...</span>
              </div>
            )}

            {/* ===== GRILLE ===== */}
            {showGrid && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                <defs>
                  <pattern id="grid-small" width={GRID_STEP_MM * PX_PER_MM} height={GRID_STEP_MM * PX_PER_MM} patternUnits="userSpaceOnUse">
                    <path d={`M ${GRID_STEP_MM * PX_PER_MM} 0 L 0 0 0 ${GRID_STEP_MM * PX_PER_MM}`} fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="0.5" />
                  </pattern>
                  <pattern id="grid-large" width={GRID_STEP_MM * 5 * PX_PER_MM} height={GRID_STEP_MM * 5 * PX_PER_MM} patternUnits="userSpaceOnUse">
                    <rect width={GRID_STEP_MM * 5 * PX_PER_MM} height={GRID_STEP_MM * 5 * PX_PER_MM} fill="url(#grid-small)" />
                    <path d={`M ${GRID_STEP_MM * 5 * PX_PER_MM} 0 L 0 0 0 ${GRID_STEP_MM * 5 * PX_PER_MM}`} fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-large)" />
              </svg>
            )}

            {/* ===== GUIDES STATIQUES ===== */}
            {showGuides && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 6 }}>
                {staticGuides.map((g, i) => {
                  const isActive = activeGuides.some(ag => ag.axis === g.axis && ag.position === g.position);
                  const isCenterLine = (g.axis === 'x' && g.position === PAGE_WIDTH_MM / 2) || (g.axis === 'y' && g.position === PAGE_HEIGHT_MM / 2);
                  const color = isActive ? 'rgba(239,68,68,0.9)' : isCenterLine ? 'rgba(16,185,129,0.35)' : 'rgba(147,51,234,0.15)';
                  const width = isActive ? 2 : isCenterLine ? 1 : 0.5;
                  const dashArray = isActive ? 'none' : '6,4';

                  if (g.axis === 'x') {
                    return <line key={i} x1={g.position * PX_PER_MM} y1={0} x2={g.position * PX_PER_MM} y2={canvasHeight}
                      stroke={color} strokeWidth={width} strokeDasharray={dashArray} />;
                  }
                  return <line key={i} x1={0} y1={g.position * PX_PER_MM} x2={canvasWidth} y2={g.position * PX_PER_MM}
                    stroke={color} strokeWidth={width} strokeDasharray={dashArray} />;
                })}
              </svg>
            )}

            {/* ===== INDICATEUR DE SÉLECTION (visuel uniquement, pointer-events: none) ===== */}
            {selectedElementId && (() => {
              const data = getNestedValue(template, selectedElementId);
              if (!data) return null;
              const overlayStyle = getOverlayStyle(selectedElementId, data);
              if (!overlayStyle) return null;
              const label = dynamicElements.find(e => e.id === selectedElementId)?.label;
              return (
                <div
                  className="absolute border-2 border-blue-600 bg-blue-500/10 pointer-events-none transition-all duration-75"
                  style={{ ...overlayStyle, zIndex: 60 }}
                >
                  {label && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm whitespace-nowrap shadow-sm">
                      {label}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Modal Aperçu PDF */}
      {previewPdfUri && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col p-4 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4 text-white">
            <h2 className="text-xl font-bold flex items-center gap-2">👁️ Aperçu PDF <span className="text-sm font-normal text-gray-400">(jsPDF)</span></h2>
            <button onClick={() => setPreviewPdfUri(null)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">❌ Fermer</button>
          </div>
          <div className="flex-1 bg-white rounded shadow-2xl overflow-hidden">
            <iframe src={previewPdfUri} className="w-full h-full border-0" title="PDF Preview" />
          </div>
        </div>
      )}
    </div>
  );
}
