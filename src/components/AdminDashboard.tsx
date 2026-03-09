/**
 * Page d'administration professionnelle complète
 * 
 * Fonctionnalités :
 * - Tableau de bord avec statistiques
 * - Gestion des codes d'accès (individuels et universels)
 * - Gestion avancée du temps (heures, minutes, jours)
 * - Liste des soumissions avec classement
 * - Suppression de soumissions
 * - Archivage et création de nouvelles listes
 * - Export CSV des résultats
 * - Filtres et recherche
 */

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { concoursData } from '../data/questions';

// Types
interface AccessCode {
  id: string;
  token: string;
  concours_id: string | null;
  candidate_name: string | null;
  candidate_email: string | null;
  expires_at: string;
  used: boolean;
  used_at: string | null;
  device_id: string | null;
  created_at: string;
  is_universal: boolean;
  max_uses: number | null;
  current_uses: number;
}

interface Submission {
  id: string;
  concours_id: string;
  candidate_name: string;
  candidate_phone: string;
  score: number;
  score_final: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  proctoring_penalty: number;
  created_at: string;
}

interface Stats {
  totalSubmissions: number;
  totalCodes: number;
  activeCodes: number;
  usedCodes: number;
  averageScore: number;
  todaySubmissions: number;
}

interface AdminDashboardProps {
  onClose: () => void;
}

// Mot de passe administrateur
const ADMIN_PASSWORD = 'QCM_ADMIN_2024';

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  // États d'authentification
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // États de navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'codes' | 'submissions'>('dashboard');

  // États des données
  const [stats, setStats] = useState<Stats | null>(null);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtres
  const [filterConcours, setFilterConcours] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sélection pour suppression multiple
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Modal de confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Formulaire de création de code avec options avancées
  const [newCode, setNewCode] = useState({
    concoursId: '',
    candidateName: '',
    candidateEmail: '',
    expiresDays: 0,
    expiresHours: 24,
    expiresMinutes: 0,
    quantity: 1,
    isUniversal: false,
    maxUses: 100,
  });
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  // Charger les données après authentification
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  // Gérer la sélection de tous
  useEffect(() => {
    if (selectAll) {
      const filteredIds = getFilteredSubmissions().map(s => s.id);
      setSelectedSubmissions(new Set(filteredIds));
    } else {
      setSelectedSubmissions(new Set());
    }
  }, [selectAll]);

  // Fonction de connexion
  const handleLogin = () => {
    setIsLoading(true);
    setAuthError('');
    
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      setAuthError('Mot de passe incorrect');
    }
    setIsLoading(false);
  };

  // Charger toutes les données
  const loadAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      loadStats(),
      loadCodes(),
      loadSubmissions(),
    ]);
    setIsLoading(false);
  };

  // Charger les statistiques
  const loadStats = async () => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      // Compter les soumissions
      const { count: totalSubmissions } = await supabase
        .from('quiz_submissions')
        .select('*', { count: 'exact', head: true });

      // Soumissions d'aujourd'hui
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todaySubmissions } = await supabase
        .from('quiz_submissions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Score moyen
      const { data: avgData } = await supabase
        .from('quiz_submissions')
        .select('score_final, total_questions');
      
      let averageScore = 0;
      if (avgData && avgData.length > 0) {
        const totalPercentage = avgData.reduce((sum, s) => {
          return sum + (s.score_final / s.total_questions) * 100;
        }, 0);
        averageScore = Math.round(totalPercentage / avgData.length);
      }

      // Compter les codes
      const { data: codesData } = await supabase
        .from('access_codes')
        .select('used');

      const totalCodes = codesData?.length || 0;
      const usedCodes = codesData?.filter(c => c.used).length || 0;
      const activeCodes = totalCodes - usedCodes;

      setStats({
        totalSubmissions: totalSubmissions || 0,
        totalCodes,
        activeCodes,
        usedCodes,
        averageScore,
        todaySubmissions: todaySubmissions || 0,
      });

    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  // Charger les codes
  const loadCodes = async () => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCodes(data);
      }
    } catch (error) {
      console.error('Erreur chargement codes:', error);
    }
  };

  // Charger les soumissions
  const loadSubmissions = async () => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('quiz_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!error && data) {
        setSubmissions(data);
      }
    } catch (error) {
      console.error('Erreur chargement soumissions:', error);
    }
  };

  // Générer un code d'accès
  const generateToken = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
      if (i === 4) token += '-';
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  // Calculer le temps d'expiration total en millisecondes
  const calculateExpirationMs = () => {
    const days = newCode.expiresDays * 24 * 60 * 60 * 1000;
    const hours = newCode.expiresHours * 60 * 60 * 1000;
    const minutes = newCode.expiresMinutes * 60 * 1000;
    return days + hours + minutes;
  };

  // Créer des codes
  const handleCreateCodes = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setMessage({ type: 'error', text: 'Base de données non configurée' });
      return;
    }

    const expirationMs = calculateExpirationMs();
    if (expirationMs <= 0) {
      setMessage({ type: 'error', text: 'Veuillez définir une durée de validité' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setGeneratedCodes([]);

    const created: string[] = [];
    const expiresAt = new Date(Date.now() + expirationMs);

    for (let i = 0; i < newCode.quantity; i++) {
      const token = generateToken();
      
      const { error } = await supabase
        .from('access_codes')
        .insert({
          token: token,
          concours_id: newCode.concoursId || null,
          candidate_name: newCode.candidateName || null,
          candidate_email: newCode.candidateEmail || null,
          expires_at: expiresAt.toISOString(),
          used: false,
          is_universal: newCode.isUniversal,
          max_uses: newCode.isUniversal ? newCode.maxUses : 1,
          current_uses: 0,
        });

      if (!error) {
        created.push(token);
      }
    }

    setIsLoading(false);

    if (created.length > 0) {
      setGeneratedCodes(created);
      setMessage({ type: 'success', text: `${created.length} code(s) créé(s) avec succès` });
      loadCodes();
      loadStats();
      setNewCode({
        concoursId: '',
        candidateName: '',
        candidateEmail: '',
        expiresDays: 0,
        expiresHours: 24,
        expiresMinutes: 0,
        quantity: 1,
        isUniversal: false,
        maxUses: 100,
      });
    } else {
      setMessage({ type: 'error', text: 'Erreur lors de la création des codes' });
    }
  };

  // Supprimer un code
  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('Supprimer ce code ?')) return;
    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase
      .from('access_codes')
      .delete()
      .eq('id', codeId);

    if (!error) {
      setMessage({ type: 'success', text: 'Code supprimé' });
      loadCodes();
      loadStats();
    }
  };

  // Supprimer une soumission
  const handleDeleteSubmission = async (submissionId: string) => {
    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase
      .from('quiz_submissions')
      .delete()
      .eq('id', submissionId);

    if (!error) {
      setSubmissions(prev => prev.filter(s => s.id !== submissionId));
      setMessage({ type: 'success', text: 'Soumission supprimée' });
      loadStats();
    } else {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  };

  // Supprimer les soumissions sélectionnées
  const handleDeleteSelected = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    if (selectedSubmissions.size === 0) return;

    setIsLoading(true);
    let deletedCount = 0;

    for (const id of selectedSubmissions) {
      const { error } = await supabase
        .from('quiz_submissions')
        .delete()
        .eq('id', id);

      if (!error) {
        deletedCount++;
      }
    }

    setIsLoading(false);
    setShowDeleteModal(false);
    setSelectedSubmissions(new Set());
    setSelectAll(false);

    if (deletedCount > 0) {
      setMessage({ type: 'success', text: `${deletedCount} soumission(s) supprimée(s)` });
      loadSubmissions();
      loadStats();
    }
  };

  // Archiver toutes les soumissions (créer une nouvelle liste)
  const handleArchiveAll = async () => {
    if (!isSupabaseConfigured || !supabase) return;

    setIsLoading(true);

    // Supprimer toutes les soumissions actuelles
    const { error } = await supabase
      .from('quiz_submissions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprime tout

    setIsLoading(false);
    setShowArchiveModal(false);

    if (!error) {
      setMessage({ type: 'success', text: 'Toutes les soumissions ont été archivées. Nouvelle liste créée.' });
      setSubmissions([]);
      loadStats();
    } else {
      setMessage({ type: 'error', text: 'Erreur lors de l\'archivage' });
    }
  };

  // Copier dans le presse-papiers
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copié !' });
    setTimeout(() => setMessage(null), 2000);
  };

  // Exporter en CSV
  const exportToCSV = () => {
    const filteredSubmissions = getFilteredSubmissions();
    
    // Trier par score pour le classement
    const sorted = [...filteredSubmissions].sort((a, b) => b.score_final - a.score_final);
    
    const headers = ['Rang', 'Nom', 'Téléphone', 'Concours', 'Score', 'Score Final', 'Total', 'Correctes', 'Incorrectes', 'Sans réponse', 'Pénalité', 'Date'];
    const rows = sorted.map((s, index) => [
      index + 1,
      s.candidate_name,
      s.candidate_phone,
      s.concours_id,
      s.score,
      s.score_final,
      s.total_questions,
      s.correct_answers,
      s.wrong_answers,
      s.unanswered,
      s.proctoring_penalty,
      new Date(s.created_at).toLocaleString('fr-FR'),
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resultats_qcm_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    setMessage({ type: 'success', text: 'Export CSV téléchargé' });
  };

  // Filtrer les soumissions
  const getFilteredSubmissions = () => {
    return submissions.filter(s => {
      const matchConcours = !filterConcours || s.concours_id === filterConcours;
      const matchSearch = !searchQuery || 
        s.candidate_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.candidate_phone.includes(searchQuery);
      return matchConcours && matchSearch;
    });
  };

  // Toggle sélection d'une soumission
  const toggleSubmissionSelection = (id: string) => {
    const newSelected = new Set(selectedSubmissions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSubmissions(newSelected);
  };

  // Formater la date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Formater la durée restante
  const formatRemainingTime = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expiré';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  // Vérifier si expiré
  const isExpired = (dateStr: string) => new Date(dateStr) < new Date();

  // ═══════════════════════════════════════════════════════════════════
  // PAGE DE CONNEXION
  // ═══════════════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-8 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Administration</h1>
            <p className="text-emerald-100">Panneau de gestion QCM Concours</p>
          </div>

          {/* Formulaire */}
          <div className="p-8">
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mot de passe administrateur
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="••••••••••"
                autoFocus
              />
            </div>

            {authError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {authError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleLogin}
                disabled={isLoading || !adminPassword}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // TABLEAU DE BORD PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 bg-gray-100 z-50 overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold">Administration QCM</h1>
                <p className="text-emerald-100 text-sm">Gestion des codes et résultats</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Onglets */}
              <div className="hidden md:flex bg-white/10 rounded-lg p-1">
                {[
                  { id: 'dashboard', label: 'Tableau de bord', icon: '📊' },
                  { id: 'codes', label: 'Codes', icon: '🔑' },
                  { id: 'submissions', label: 'Soumissions', icon: '📝' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'dashboard' | 'codes' | 'submissions')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-emerald-700'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Fermer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Onglets mobile */}
          <div className="flex md:hidden mt-4 bg-white/10 rounded-lg p-1">
            {[
              { id: 'dashboard', label: '📊', full: 'Dashboard' },
              { id: 'codes', label: '🔑', full: 'Codes' },
              { id: 'submissions', label: '📝', full: 'Résultats' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'dashboard' | 'codes' | 'submissions')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-emerald-700'
                    : 'text-white'
                }`}
              >
                {tab.label} <span className="hidden sm:inline">{tab.full}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <span>{message.type === 'success' ? '✅' : '❌'}</span>
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto text-lg">×</button>
          </div>
        )}

        {/* Codes générés */}
        {generatedCodes.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
              ✅ Codes générés (cliquez pour copier)
            </h3>
            <div className="flex flex-wrap gap-2">
              {generatedCodes.map((code, index) => (
                <button
                  key={index}
                  onClick={() => copyToClipboard(code)}
                  className="px-4 py-2 bg-white border border-emerald-300 rounded-lg font-mono text-lg hover:bg-emerald-100 transition-colors"
                >
                  {code}
                </button>
              ))}
            </div>
            <button
              onClick={() => copyToClipboard(generatedCodes.join('\n'))}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
            >
              📋 Copier tous les codes
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: TABLEAU DE BORD */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <>
            {/* Statistiques */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total soumissions', value: stats?.totalSubmissions || 0, icon: '📝', color: 'bg-blue-500' },
                { label: 'Aujourd\'hui', value: stats?.todaySubmissions || 0, icon: '📅', color: 'bg-green-500' },
                { label: 'Score moyen', value: `${stats?.averageScore || 0}%`, icon: '📊', color: 'bg-purple-500' },
                { label: 'Total codes', value: stats?.totalCodes || 0, icon: '🔑', color: 'bg-orange-500' },
                { label: 'Codes actifs', value: stats?.activeCodes || 0, icon: '✅', color: 'bg-emerald-500' },
                { label: 'Codes utilisés', value: stats?.usedCodes || 0, icon: '📌', color: 'bg-gray-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center text-white text-xl mb-3`}>
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Dernières soumissions */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h2 className="font-bold text-gray-800">📝 Dernières soumissions</h2>
                <button
                  onClick={() => setActiveTab('submissions')}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  Voir tout →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Candidat</th>
                      <th className="px-4 py-3 text-left">Concours</th>
                      <th className="px-4 py-3 text-center">Score</th>
                      <th className="px-4 py-3 text-center">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {submissions.slice(0, 5).map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{s.candidate_name}</td>
                        <td className="px-4 py-3 text-gray-600">{s.concours_id}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            (s.score_final / s.total_questions) >= 0.7 ? 'bg-emerald-100 text-emerald-700' :
                            (s.score_final / s.total_questions) >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {s.score_final}/{s.total_questions}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">{formatDate(s.created_at)}</td>
                      </tr>
                    ))}
                    {submissions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          Aucune soumission pour le moment
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: GESTION DES CODES */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'codes' && (
          <>
            {/* Formulaire de création */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                ➕ Créer des codes d'accès
              </h2>

              {/* Type de code */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de code
                </label>
                <div className="flex gap-3">
                  <label className={`flex-1 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    !newCode.isUniversal ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      checked={!newCode.isUniversal}
                      onChange={() => setNewCode({ ...newCode, isUniversal: false })}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-1">👤</div>
                      <div className="font-semibold text-gray-800">Code individuel</div>
                      <div className="text-xs text-gray-500">1 code = 1 candidat</div>
                    </div>
                  </label>
                  <label className={`flex-1 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    newCode.isUniversal ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      checked={newCode.isUniversal}
                      onChange={() => setNewCode({ ...newCode, isUniversal: true })}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-1">👥</div>
                      <div className="font-semibold text-gray-800">Code universel</div>
                      <div className="text-xs text-gray-500">1 code pour tous</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Concours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Concours (optionnel)
                  </label>
                  <select
                    value={newCode.concoursId}
                    onChange={(e) => setNewCode({ ...newCode, concoursId: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  >
                    <option value="">Tous les concours</option>
                    {concoursData.filter(c => c.available).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Quantité ou Max uses */}
                {!newCode.isUniversal ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de codes à générer
                    </label>
                    <input
                      type="number"
                      value={newCode.quantity}
                      onChange={(e) => setNewCode({ ...newCode, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      min="1"
                      max="100"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre max d'utilisations
                    </label>
                    <input
                      type="number"
                      value={newCode.maxUses}
                      onChange={(e) => setNewCode({ ...newCode, maxUses: parseInt(e.target.value) || 100 })}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      min="1"
                      max="10000"
                    />
                  </div>
                )}
              </div>

              {/* Durée de validité */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée de validité
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Jours</label>
                    <input
                      type="number"
                      value={newCode.expiresDays}
                      onChange={(e) => setNewCode({ ...newCode, expiresDays: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      min="0"
                      max="365"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Heures</label>
                    <input
                      type="number"
                      value={newCode.expiresHours}
                      onChange={(e) => setNewCode({ ...newCode, expiresHours: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      min="0"
                      max="23"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Minutes</label>
                    <input
                      type="number"
                      value={newCode.expiresMinutes}
                      onChange={(e) => setNewCode({ ...newCode, expiresMinutes: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      min="0"
                      max="59"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Durée totale : {newCode.expiresDays}j {newCode.expiresHours}h {newCode.expiresMinutes}min
                </p>
              </div>

              {/* Bouton créer */}
              <button
                onClick={handleCreateCodes}
                disabled={isLoading || calculateExpirationMs() <= 0}
                className="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <span>🔑</span> Générer {newCode.isUniversal ? 'le code universel' : `${newCode.quantity} code(s)`}
                  </>
                )}
              </button>
            </div>

            {/* Liste des codes */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h2 className="font-bold text-gray-800">🔑 Liste des codes ({codes.length})</h2>
                <button
                  onClick={loadCodes}
                  disabled={isLoading}
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  🔄 Actualiser
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Statut</th>
                      <th className="px-4 py-3 text-left">Concours</th>
                      <th className="px-4 py-3 text-left">Temps restant</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {codes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          Aucun code créé
                        </td>
                      </tr>
                    ) : (
                      codes.map((code) => (
                        <tr key={code.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => copyToClipboard(code.token)}
                              className="font-mono text-lg hover:text-emerald-600 transition-colors"
                              title="Cliquer pour copier"
                            >
                              {code.token}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            {code.is_universal ? (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                👥 Universel ({code.current_uses || 0}/{code.max_uses || '∞'})
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                👤 Individuel
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {code.used && !code.is_universal ? (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                📌 Utilisé
                              </span>
                            ) : isExpired(code.expires_at) ? (
                              <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                                ⏰ Expiré
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-full text-xs font-medium">
                                ✅ Actif
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {code.concours_id || 'Tous'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {formatRemainingTime(code.expires_at)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleDeleteCode(code.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: SOUMISSIONS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'submissions' && (
          <>
            {/* Actions de masse */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Recherche */}
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="🔍 Rechercher par nom ou téléphone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* Filtre concours */}
                <select
                  value={filterConcours}
                  onChange={(e) => setFilterConcours(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="">Tous les concours</option>
                  {concoursData.filter(c => c.available).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                {/* Boutons d'action */}
                <div className="flex gap-2">
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold flex items-center gap-2"
                  >
                    📥 Exporter CSV
                  </button>

                  {selectedSubmissions.size > 0 && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold flex items-center gap-2"
                    >
                      🗑️ Supprimer ({selectedSubmissions.size})
                    </button>
                  )}

                  <button
                    onClick={() => setShowArchiveModal(true)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all font-semibold flex items-center gap-2"
                  >
                    📦 Nouvelle liste
                  </button>

                  <button
                    onClick={loadSubmissions}
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl transition-colors"
                  >
                    🔄
                  </button>
                </div>
              </div>
            </div>

            {/* Tableau des soumissions avec classement */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h2 className="font-bold text-gray-800">
                  📝 Résultats et classement ({getFilteredSubmissions().length} candidats)
                </h2>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => setSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Tout sélectionner
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={(e) => setSelectAll(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-center w-16">Rang</th>
                      <th className="px-4 py-3 text-left">Candidat</th>
                      <th className="px-4 py-3 text-left">Téléphone</th>
                      <th className="px-4 py-3 text-left">Concours</th>
                      <th className="px-4 py-3 text-center">Score</th>
                      <th className="px-4 py-3 text-center">Pénalité</th>
                      <th className="px-4 py-3 text-center">Final</th>
                      <th className="px-4 py-3 text-center">Date</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {getFilteredSubmissions().length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                          Aucune soumission trouvée
                        </td>
                      </tr>
                    ) : (
                      [...getFilteredSubmissions()]
                        .sort((a, b) => b.score_final - a.score_final)
                        .map((s, index) => (
                          <tr key={s.id} className={`hover:bg-gray-50 ${selectedSubmissions.has(s.id) ? 'bg-emerald-50' : ''}`}>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedSubmissions.has(s.id)}
                                onChange={() => toggleSubmissionSelection(s.id)}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              {index === 0 && <span className="text-2xl">🥇</span>}
                              {index === 1 && <span className="text-2xl">🥈</span>}
                              {index === 2 && <span className="text-2xl">🥉</span>}
                              {index > 2 && <span className="font-bold text-gray-500">#{index + 1}</span>}
                            </td>
                            <td className="px-4 py-3 font-medium">{s.candidate_name}</td>
                            <td className="px-4 py-3 text-gray-600">{s.candidate_phone}</td>
                            <td className="px-4 py-3 text-gray-600">{s.concours_id}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-medium">
                                {s.score}/{s.total_questions}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {s.proctoring_penalty > 0 ? (
                                <span className="text-red-600 font-medium">-{s.proctoring_penalty}</span>
                              ) : (
                                <span className="text-gray-400">0</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                (s.score_final / s.total_questions) >= 0.7 ? 'bg-emerald-100 text-emerald-700' :
                                (s.score_final / s.total_questions) >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {s.score_final}/{s.total_questions}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-500 text-xs">
                              {formatDate(s.created_at)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <a
                                  href={`?correction=${s.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium"
                                >
                                  👁️
                                </a>
                                <button
                                  onClick={() => handleDeleteSubmission(s.id)}
                                  className="px-2 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🗑️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Confirmer la suppression</h3>
              <p className="text-gray-600">
                Voulez-vous vraiment supprimer <strong>{selectedSubmissions.size}</strong> soumission(s) ?
                Cette action est irréversible.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold disabled:opacity-50"
              >
                {isLoading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'archivage (nouvelle liste) */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📦</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Créer une nouvelle liste</h3>
              <p className="text-gray-600">
                Cette action va supprimer toutes les soumissions actuelles ({submissions.length}) 
                pour recommencer avec une liste vide.
              </p>
              <p className="text-sm text-orange-600 mt-2 font-medium">
                ⚠️ Pensez à exporter les données avant de continuer !
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold"
              >
                📥 Exporter d'abord
              </button>
              <button
                onClick={handleArchiveAll}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all font-semibold disabled:opacity-50"
              >
                {isLoading ? 'Archivage...' : 'Nouvelle liste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
