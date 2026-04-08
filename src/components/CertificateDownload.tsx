/**
 * Composant de téléchargement de certificat
 * Affiche un bouton pour télécharger le certificat si éligible
 */

import { useState } from 'react';
import {
  generateCertificate,
  isEligibleForCertificate,
  getMention,
  safePercentage,
  type CertificateData,
} from '../services/certificate';

interface CertificateDownloadProps {
  candidateName: string;
  candidatePhone: string;
  concoursName: string;
  score: number;
  totalQuestions: number;
  scoreFinal: number;
  submissionId: string;
}

export default function CertificateDownload({
  candidateName,
  concoursName,
  score,
  totalQuestions,
  scoreFinal,
  submissionId,
}: CertificateDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<{
    success?: boolean;
    message?: string;
    certificateId?: string;
  } | null>(null);
  
  const percentage = safePercentage(scoreFinal, totalQuestions);
  const eligible = isEligibleForCertificate(percentage);
  const mention = getMention(percentage);
  
  const handleDownload = async () => {
    setIsGenerating(true);
    setDownloadStatus(null);
    
    const data: CertificateData = {
      candidateName,
      concoursName,
      score,
      totalQuestions,
      scoreFinal,
      date: new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      submissionId,
    };
    
    const result = await generateCertificate(data);
    
    setDownloadStatus({
      success: result.success,
      message: result.message,
      certificateId: result.certificateId,
    });
    
    setIsGenerating(false);
  };
  
  // Si non éligible
  if (!eligible) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Certificat non disponible
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Le score minimum requis est de <strong>50%</strong> pour obtenir un certificat.
        </p>
        <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
          <span className="text-gray-600">Votre score :</span>
          <span className="font-bold text-gray-700">{percentage}%</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">Requis :</span>
          <span className="font-bold text-emerald-600">50%</span>
        </div>
      </div>
    );
  }
  
  // Si éligible
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-amber-50 border-2 border-emerald-200 rounded-xl p-6">
      {/* En-tête */}
      <div className="flex items-center gap-4 mb-6">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
          style={{ backgroundColor: mention.color }}
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">
            Félicitations ! 🎉
          </h3>
          <p className="text-gray-600">
            Vous êtes éligible au certificat de réussite
          </p>
        </div>
      </div>
      
      {/* Détails */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm text-gray-500">Score final</div>
          <div className="text-2xl font-bold text-emerald-600">
            {scoreFinal}/{totalQuestions}
          </div>
          <div className="text-sm text-gray-500">{percentage}%</div>
        </div>
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm text-gray-500">Mention obtenue</div>
          <div 
            className="text-2xl font-bold"
            style={{ color: mention.color }}
          >
            {mention.label}
          </div>
          <div className="text-sm text-gray-500">{concoursName}</div>
        </div>
      </div>
      
      {/* Bouton de téléchargement */}
      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className={`
          w-full py-4 px-6 rounded-xl font-bold text-lg
          flex items-center justify-center gap-3
          transition-all duration-200 shadow-lg
          ${isGenerating
            ? 'bg-gray-400 cursor-wait'
            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white hover:shadow-xl hover:-translate-y-0.5'
          }
        `}
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Génération en cours...</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Télécharger mon certificat PDF</span>
          </>
        )}
      </button>
      
      {/* Statut du téléchargement */}
      {downloadStatus && (
        <div className={`
          mt-4 p-4 rounded-lg flex items-start gap-3
          ${downloadStatus.success
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-red-100 text-red-800'
          }
        `}>
          {downloadStatus.success ? (
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <div>
            <p className="font-medium">{downloadStatus.message}</p>
            {downloadStatus.certificateId && (
              <p className="text-sm mt-1 opacity-80">
                N° du certificat : <strong>{downloadStatus.certificateId}</strong>
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Note */}
      <p className="mt-4 text-xs text-gray-500 text-center">
        Le certificat est vérifiable en ligne grâce au QR code intégré.
      </p>
    </div>
  );
}
