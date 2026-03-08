/**
 * Page d'administration pour gérer les codes d'accès
 * Accessible uniquement avec le mot de passe admin
 */

import { useState, useEffect } from 'react';
import { 
  createAccessCode, 
  listAccessCodes, 
  deleteAccessCode,
  AccessCode
} from '../services/accessCodeService';
import { concoursData } from '../data/questions';

interface AdminCodesPageProps {
  onClose: () => void;
}

export default function AdminCodesPage({ onClose }: AdminCodesPageProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Formulaire de création
  const [newCode, setNewCode] = useState({
    concoursId: '',
    candidateName: '',
    candidateEmail: '',
    expiresInHours: 24,
    quantity: 1,
  });
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  // Charger les codes après authentification
  useEffect(() => {
    if (isAuthenticated) {
      loadCodes();
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    setIsLoading(true);
    setAuthError('');
    
    const result = await listAccessCodes(adminPassword);
    
    setIsLoading(false);
    
    if (result.success) {
      setIsAuthenticated(true);
      setCodes(result.codes || []);
    } else {
      setAuthError(result.message);
    }
  };

  const loadCodes = async () => {
    setIsLoading(true);
    const result = await listAccessCodes(adminPassword);
    setIsLoading(false);
    
    if (result.success) {
      setCodes(result.codes || []);
    }
  };

  const handleCreateCodes = async () => {
    setIsLoading(true);
    setMessage(null);
    setGeneratedCodes([]);

    const created: string[] = [];
    
    for (let i = 0; i < newCode.quantity; i++) {
      const result = await createAccessCode({
        concoursId: newCode.concoursId || undefined,
        candidateName: newCode.candidateName || undefined,
        candidateEmail: newCode.candidateEmail || undefined,
        expiresInHours: newCode.expiresInHours,
        adminPassword: adminPassword,
      });

      if (result.success && result.token) {
        created.push(result.token);
      }
    }

    setIsLoading(false);

    if (created.length > 0) {
      setGeneratedCodes(created);
      setMessage({ type: 'success', text: `${created.length} code(s) créé(s) avec succès.` });
      loadCodes();
      // Réinitialiser le formulaire
      setNewCode({
        concoursId: '',
        candidateName: '',
        candidateEmail: '',
        expiresInHours: 24,
        quantity: 1,
      });
    } else {
      setMessage({ type: 'error', text: 'Erreur lors de la création des codes.' });
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce code ?')) {
      return;
    }

    setIsLoading(true);
    const result = await deleteAccessCode(codeId, adminPassword);
    setIsLoading(false);

    if (result.success) {
      setMessage({ type: 'success', text: 'Code supprimé.' });
      loadCodes();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Code copié dans le presse-papiers !' });
    setTimeout(() => setMessage(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  // Page de connexion admin
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Administration</h2>
                <p className="text-white/80 text-sm">Gestion des codes d'accès</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe administrateur
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none"
                placeholder="Entrez le mot de passe"
              />
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {authError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleLogin}
                disabled={isLoading || !adminPassword}
                className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium disabled:opacity-50"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Page d'administration
  return (
    <div className="fixed inset-0 bg-gray-100 z-50 overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold">Gestion des codes d'accès</h1>
              <p className="text-white/60 text-sm">{codes.length} code(s) au total</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Fermer
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* Codes générés */}
        {generatedCodes.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Codes générés (cliquez pour copier)
            </h3>
            <div className="flex flex-wrap gap-2">
              {generatedCodes.map((code, index) => (
                <button
                  key={index}
                  onClick={() => copyToClipboard(code)}
                  className="px-4 py-2 bg-white border border-green-300 rounded-lg font-mono text-lg hover:bg-green-100 transition-colors"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Formulaire de création */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Créer des codes d'accès
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Concours (optionnel)
              </label>
              <select
                value={newCode.concoursId}
                onChange={(e) => setNewCode({ ...newCode, concoursId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="">Tous les concours</option>
                {concoursData.filter(c => c.available).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du candidat (optionnel)
              </label>
              <input
                type="text"
                value={newCode.candidateName}
                onChange={(e) => setNewCode({ ...newCode, candidateName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Ex: Jean Dupont"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (optionnel)
              </label>
              <input
                type="email"
                value={newCode.candidateEmail}
                onChange={(e) => setNewCode({ ...newCode, candidateEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Ex: jean@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Validité (heures)
              </label>
              <input
                type="number"
                value={newCode.expiresInHours}
                onChange={(e) => setNewCode({ ...newCode, expiresInHours: parseInt(e.target.value) || 24 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                min="1"
                max="720"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de codes
              </label>
              <input
                type="number"
                value={newCode.quantity}
                onChange={(e) => setNewCode({ ...newCode, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                min="1"
                max="100"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleCreateCodes}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Création...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Générer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Liste des codes */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Liste des codes</h2>
            <button
              onClick={loadCodes}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              Actualiser
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Concours</th>
                  <th className="px-4 py-3 font-medium">Candidat</th>
                  <th className="px-4 py-3 font-medium">Expire le</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {codes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Aucun code créé. Utilisez le formulaire ci-dessus pour en créer.
                    </td>
                  </tr>
                ) : (
                  codes.map((code) => (
                    <tr key={code.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => copyToClipboard(code.token)}
                          className="font-mono text-lg hover:text-green-600 transition-colors"
                          title="Cliquez pour copier"
                        >
                          {code.token}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {code.used ? (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            Utilisé
                          </span>
                        ) : isExpired(code.expires_at) ? (
                          <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                            Expiré
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs font-medium">
                            Actif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {code.concours_id || 'Tous'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {code.candidate_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(code.expires_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteCode(code.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
