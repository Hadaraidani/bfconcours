/**
 * Hook React qui génère un aperçu fidèle du certificat en utilisant
 * le MÊME moteur de rendu (jsPDF) que la génération finale,
 * puis convertit le PDF en image canvas via pdf.js.
 *
 * Garantit une fidélité 100% entre l'aperçu et le PDF téléchargé.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import type { CertificateTemplate, CertificateData } from '../services/certificate/certificateTypes';
import { renderCertificate, type RenderData } from '../services/certificate/certificateTemplate';
import {
  safePercentage,
  getMention,
  loadImageWithTimeout,
  generateQRCodeBase64,
} from '../services/certificate/certificateUtils';

// Configure le worker pdf.js via CDN (évite les problèmes de build Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Largeur cible du canvas de preview (correspond au workspace de l'éditeur)
const TARGET_CANVAS_WIDTH = 1122;

interface PdfPreviewResult {
  imageUrl: string | null;
  isRendering: boolean;
  canvasWidth: number;
  canvasHeight: number;
  forceRender: () => void;
}

export function usePdfPreview(
  template: CertificateTemplate,
  mockData: CertificateData,
): PdfPreviewResult {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(794);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const assetsRef = useRef<{ emblem: string | null; qr: string } | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);
  const mountedRef = useRef(true);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Charger les assets (emblème + QR code) une seule fois
  useEffect(() => {
    let cancelled = false;
    async function loadAssets() {
      const src = template.emblem.src;
      const [emblem, qr] = await Promise.all([
        src.startsWith('data:') ? Promise.resolve(src) : loadImageWithTimeout(src),
        generateQRCodeBase64('https://example.com/verify?id=CERT-PREVIEW'),
      ]);
      if (!cancelled) {
        assetsRef.current = { emblem, qr };
        setAssetsReady(true);
      }
    }
    loadAssets();
    return () => { cancelled = true; };
  }, [template.emblem.src]);

  // Fonction de rendu principale
  const renderPreview = useCallback(async () => {
    if (!assetsRef.current || !mountedRef.current) return;
    setIsRendering(true);

    try {
      // 1. Générer le PDF avec jsPDF (identique au rendu final)
      const doc = new jsPDF({
        orientation: template.page.orientation,
        unit: 'mm',
        format: template.page.format,
      });

      const displayScore = mockData.scoreFinal ?? mockData.score;
      const percentage = safePercentage(displayScore, mockData.totalQuestions);
      const mentionInfo = getMention(percentage);

      const renderData: RenderData = {
        candidateName: mockData.candidateName,
        concoursName: mockData.concoursName,
        displayScore,
        totalQuestions: mockData.totalQuestions,
        percentage,
        mentionInfo,
        formattedDate: mockData.submissionDate || new Date().toLocaleDateString('fr-FR'),
        certificateId: 'CERT-PREVIEW-2026',
        verificationUrl: 'https://example.com/verify',
        emblemBase64: assetsRef.current.emblem,
        qrCodeBase64: assetsRef.current.qr,
      };

      renderCertificate(doc, template, renderData, { isExport: false });

      // 2. Convertir en ArrayBuffer
      const pdfData = doc.output('arraybuffer');

      // 3. Rasteriser avec pdf.js → Canvas
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const page = await pdf.getPage(1);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = TARGET_CANVAS_WIDTH / baseViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      if (mountedRef.current) {
        setImageUrl(canvas.toDataURL('image/png'));
        setCanvasHeight(canvas.height);
      }

      pdf.destroy();
    } catch (e) {
      console.error('Erreur rendu preview PDF:', e);
    } finally {
      if (mountedRef.current) setIsRendering(false);
    }
  }, [template, mockData, assetsReady]);

  // Rendu debounced à chaque changement
  useEffect(() => {
    if (!assetsReady) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(renderPreview, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [renderPreview, assetsReady]);

  // Forcer un rendu immédiat (sans debounce)
  const forceRender = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    renderPreview();
  }, [renderPreview]);

  return {
    imageUrl,
    isRendering,
    canvasWidth: TARGET_CANVAS_WIDTH,
    canvasHeight,
    forceRender,
  };
}
