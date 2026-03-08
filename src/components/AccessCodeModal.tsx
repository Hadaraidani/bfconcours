/**
 * Modal de vérification du code d'accès - Design Professionnel
 * L'utilisateur doit entrer son code unique avant de commencer le QCM
 * 
 * Pour changer le design, voir le fichier docs/GUIDE_DESIGN_CODE_MODAL.md
 */

import { useState, useEffect, useRef } from 'react';
import { verifyAccessCode, getStoredAccessCode, storeAccessCode, VerifyCodeResult } from '../services/accessCodeService';

interface AccessCodeModalProps {
  onValidated: (result: VerifyCodeResult) => void;
  onCancel: () => void;
}

export default function AccessCodeModal({ onValidated, onCancel }: AccessCodeModalProps) {
  const [code, setCode] = useState(['', '', '', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingStored, setCheckingStored] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasCheckedStored = useRef(false);

  // Vérifier si un code est déjà stocké (reprise de session)
  useEffect(() => {
    if (hasCheckedStored.current) return;
    hasCheckedStored.current = true;

    const checkStoredCode = async () => {
      try {
        const storedCode = getStoredAccessCode();
        
        if (storedCode) {
          const result = await verifyAccessCode(storedCode);
          if (result.success) {
            onValidated(result);
            return;
          }
        }
      } catch (err) {
        console.error('Erreur vérification code stocké:', err);
      }
      
      setCheckingStored(false);
    };
    
    checkStoredCode();
  }, [onValidated]);

  // Focus sur le premier input au chargement
  useEffect(() => {
    if (!checkingStored && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [checkingStored]);

  const handleInputChange = (index: number, value: string) => {
    const cleanValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 1);
    
    const newCode = [...code];
    newCode[index] = cleanValue;
    setCode(newCode);
    setError(null);

    if (cleanValue && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }

    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (pastedText.length >= 8) {
      const newCode = pastedText.slice(0, 8).split('');
      while (newCode.length < 8) newCode.push('');
      setCode(newCode);
      inputRefs.current[7]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    
    const fullCode = code.join('');
    
    if (fullCode.length !== 8) {
      setError('Veuillez entrer un code complet (8 caractères).');
      return;
    }

    const formattedCode = `${fullCode.slice(0, 4)}-${fullCode.slice(4)}`;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyAccessCode(formattedCode);

      if (result.success) {
        storeAccessCode(formattedCode);
        onValidated(result);
      } else {
        setError(result.message);
        const form = document.getElementById('code-form');
        form?.classList.add('animate-shake');
        setTimeout(() => form?.classList.remove('animate-shake'), 500);
      }
    } catch (err) {
      console.error('Erreur vérification:', err);
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const isCodeComplete = code.every(c => c !== '');

  // Affichage pendant la vérification du code stocké
  if (checkingStored) {
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center">
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-3 bg-emerald-50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Vérification en cours</h3>
          <p className="text-slate-500 text-sm">Nous vérifions votre session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all">
        
        {/* Header avec motif */}
        <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-8 overflow-hidden">
          {/* Motif décoratif */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            {/* Icône */}
            <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mb-5 border border-white/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold mb-2">Accès sécurisé</h2>
            <p className="text-emerald-100 text-sm leading-relaxed">
              Entrez le code d'accès à 8 caractères qui vous a été fourni pour commencer l'examen.
            </p>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-8">
          {/* Champs de code */}
          <div id="code-form" className="mb-6">
            <div className="flex justify-center items-center gap-2" onPaste={handlePaste}>
              {/* Groupe 1 : 4 premiers caractères */}
              <div className="flex gap-1.5">
                {code.slice(0, 4).map((char, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    value={char}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    maxLength={1}
                    className={`w-12 h-14 text-center text-xl font-bold uppercase rounded-xl border-2 transition-all duration-200 outline-none
                      ${error 
                        ? 'border-red-400 bg-red-50 text-red-700' 
                        : char 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                          : 'border-slate-200 bg-slate-50 text-slate-700 focus:border-emerald-500 focus:bg-emerald-50'
                      }`}
                    disabled={isLoading}
                  />
                ))}
              </div>
              
              {/* Séparateur */}
              <div className="flex items-center justify-center w-6">
                <div className="w-3 h-0.5 bg-slate-300 rounded-full"></div>
              </div>
              
              {/* Groupe 2 : 4 derniers caractères */}
              <div className="flex gap-1.5">
                {code.slice(4).map((char, index) => (
                  <input
                    key={index + 4}
                    ref={(el) => { inputRefs.current[index + 4] = el; }}
                    type="text"
                    value={char}
                    onChange={(e) => handleInputChange(index + 4, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index + 4, e)}
                    maxLength={1}
                    className={`w-12 h-14 text-center text-xl font-bold uppercase rounded-xl border-2 transition-all duration-200 outline-none
                      ${error 
                        ? 'border-red-400 bg-red-50 text-red-700' 
                        : char 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                          : 'border-slate-200 bg-slate-50 text-slate-700 focus:border-emerald-500 focus:bg-emerald-50'
                      }`}
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>
            
            {/* Indicateur de progression */}
            <div className="flex justify-center gap-1 mt-4">
              {code.map((char, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    char ? 'bg-emerald-500 scale-100' : 'bg-slate-200 scale-75'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-red-800 text-sm">Code invalide</h4>
                <p className="text-red-600 text-sm mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-4">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl hover:bg-slate-200 transition-all font-semibold text-sm"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !isCodeComplete}
              className={`flex-1 px-6 py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all
                ${isCodeComplete && !isLoading
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Vérification...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Accéder à l'examen</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer minimaliste */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Code unique • Usage limité à un appareil • Contactez l'administrateur si besoin</span>
          </div>
        </div>
      </div>

      {/* Style pour l'animation de secousse */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
