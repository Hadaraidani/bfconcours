/**
 * MODAL DE CONSENTEMENT AU PROCTORING
 * 
 * Affiche les règles de surveillance et demande le consentement
 * du candidat avant de commencer l'examen.
 */

import { useState } from 'react';

interface ProctoringConsentProps {
  onAccept: () => void;
  onDecline: () => void;
  concoursName: string;
}

export function ProctoringConsent({ onAccept, onDecline, concoursName }: ProctoringConsentProps) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">Système de surveillance</h2>
              <p className="text-blue-100 text-sm">Examen : {concoursName}</p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <p className="text-gray-700 mb-4">
            Pour garantir l'intégrité de cet examen, un système de surveillance sera activé pendant toute la durée du test.
          </p>

          <h3 className="font-bold text-gray-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ce qui sera surveillé :
          </h3>

          <div className="space-y-3 mb-6">
            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-xl">🔄</span>
              <div>
                <h4 className="font-semibold text-gray-800">Changement d'onglet</h4>
                <p className="text-sm text-gray-600">Nous détectons si vous quittez la page de l'examen</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-xl">📋</span>
              <div>
                <h4 className="font-semibold text-gray-800">Copier/Coller</h4>
                <p className="text-sm text-gray-600">Les actions de copier-coller sont bloquées et enregistrées</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-xl">⌨️</span>
              <div>
                <h4 className="font-semibold text-gray-800">Raccourcis clavier</h4>
                <p className="text-sm text-gray-600">Les combinaisons suspectes (F12, Ctrl+U, etc.) sont détectées</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-xl">🖥️</span>
              <div>
                <h4 className="font-semibold text-gray-800">Mode plein écran</h4>
                <p className="text-sm text-gray-600">L'examen se déroule en mode plein écran obligatoire</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="font-semibold text-amber-800">Important</h4>
                <p className="text-sm text-amber-700">
                  Chaque comportement suspect réduit votre score de confiance. 
                  Un score trop faible peut entraîner l'invalidation de votre examen.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">Conseils pour réussir :</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Restez sur la page de l'examen
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Ne cherchez pas à copier ou coller du texte
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Gardez le mode plein écran activé
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Concentrez-vous uniquement sur les questions
              </li>
            </ul>
          </div>
        </div>

        {/* Pied de page */}
        <div className="border-t bg-gray-50 p-6">
          <label className="flex items-start space-x-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              J'ai lu et j'accepte les conditions de surveillance. Je comprends que mon comportement 
              sera surveillé pendant toute la durée de l'examen.
            </span>
          </label>

          <div className="flex space-x-3">
            <button
              onClick={onDecline}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              onClick={onAccept}
              disabled={!accepted}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                accepted
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Commencer l'examen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProctoringConsent;
