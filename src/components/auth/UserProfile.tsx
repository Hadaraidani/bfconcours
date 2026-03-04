import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getUserAttempts, 
  getUserStats, 
  QuizAttempt, 
  UserStats,
  formatDuration,
  formatRelativeDate 
} from '../../services/activityService';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Edit2,
  Save,
  X,
  LogOut,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
  Award,
  Clock,
  Target,
  TrendingUp,
  BookOpen,
  History,
  Trophy,
  Zap,
  BarChart3
} from 'lucide-react';

interface UserProfileProps {
  onClose: () => void;
}

export function UserProfile({ onClose }: UserProfileProps) {
  const { user, userProfile, signOut, updateProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'stats'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    full_name: userProfile?.full_name || '',
    phone: userProfile?.phone || '',
  });
  
  // Données d'historique et statistiques
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Charger l'historique et les statistiques
  useEffect(() => {
    if (user?.id) {
      loadUserData();
    }
  }, [user?.id]);

  const loadUserData = async () => {
    if (!user?.id) return;
    
    setLoadingHistory(true);
    try {
      const [userAttempts, userStats] = await Promise.all([
        getUserAttempts(user.id, 20),
        getUserStats(user.id)
      ]);
      setAttempts(userAttempts);
      setStats(userStats);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Gestion de la déconnexion
  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (err: any) {
      setError('Erreur lors de la déconnexion');
    }
  };

  // Gestion de la mise à jour du profil
  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await updateProfile({
        full_name: editData.full_name,
        phone: editData.phone,
      });
      
      if (result.success) {
        setSuccess(result.message || 'Profil mis à jour avec succès');
        setIsEditing(false);
      } else {
        setError(result.message || 'Erreur lors de la mise à jour');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  // Annuler les modifications
  const handleCancel = () => {
    setEditData({
      full_name: userProfile?.full_name || '',
      phone: userProfile?.phone || '',
    });
    setIsEditing(false);
    setError(null);
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Obtenir la couleur du score
  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 70) return 'text-green-600 bg-green-100';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Obtenir la couleur du badge de performance
  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 80) return { text: 'Excellent', color: 'bg-green-500' };
    if (percentage >= 60) return { text: 'Bien', color: 'bg-blue-500' };
    if (percentage >= 40) return { text: 'Moyen', color: 'bg-yellow-500' };
    return { text: 'A améliorer', color: 'bg-red-500' };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-800 px-6 py-6 text-white relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold backdrop-blur-sm border-2 border-white/30">
              {userProfile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{userProfile?.full_name || 'Utilisateur'}</h1>
              <p className="text-green-100 flex items-center gap-1 mt-1 text-sm truncate">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{user?.email}</span>
              </p>
              {/* Badges */}
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  <Shield className="w-3 h-3" />
                  Verifie
                </span>
                {stats && stats.totalAttempts > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/30 rounded-full text-xs">
                    <Award className="w-3 h-3" />
                    {stats.totalAttempts} QCM
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'profile'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profil</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'history'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Historique</span>
            {attempts.length > 0 && (
              <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                {attempts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'stats'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Statistiques</span>
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 mb-4">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Onglet Profil */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Informations personnelles</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
                    Modifier
                  </button>
                )}
              </div>

              {/* Nom complet */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500">Nom complet</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.full_name}
                      onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  ) : (
                    <p className="font-medium text-gray-900 truncate">{userProfile?.full_name || '-'}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500">Adresse email</p>
                  <p className="font-medium text-gray-900 truncate">{user?.email}</p>
                </div>
              </div>

              {/* Téléphone */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500">Telephone</p>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      placeholder="+226 70 00 00 00"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  ) : (
                    <p className="font-medium text-gray-900">{userProfile?.phone || 'Non renseigne'}</p>
                  )}
                </div>
              </div>

              {/* Date d'inscription */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500">Membre depuis</p>
                  <p className="font-medium text-gray-900">
                    {userProfile?.created_at ? formatDate(userProfile.created_at) : '-'}
                  </p>
                </div>
              </div>

              {/* Boutons d'édition */}
              {isEditing && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCancel}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-5 h-5" />
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Onglet Historique */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5" />
                Historique des QCM
              </h2>

              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                </div>
              ) : attempts.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun QCM passe pour le moment</p>
                  <p className="text-sm text-gray-400 mt-1">Vos resultats apparaitront ici</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attempts.map((attempt, index) => {
                    const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
                    const perfBadge = getPerformanceBadge(percentage);
                    
                    return (
                      <div 
                        key={attempt.id || index}
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {attempt.concours_name}
                              </h3>
                              {attempt.is_custom_exam && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                  Personnalise
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {attempt.created_at ? formatRelativeDate(attempt.created_at) : '-'}
                              <span className="mx-1">•</span>
                              {formatDuration(attempt.duration_seconds)}
                            </p>
                          </div>
                          
                          <div className="text-right flex-shrink-0">
                            <div className={`inline-flex items-center px-3 py-1 rounded-lg font-bold ${getScoreColor(attempt.score, attempt.total_questions)}`}>
                              {attempt.score}/{attempt.total_questions}
                            </div>
                            <div className="mt-1">
                              <span className={`inline-block px-2 py-0.5 text-white text-xs rounded-full ${perfBadge.color}`}>
                                {perfBadge.text}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Détails */}
                        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-green-50 rounded-lg py-2">
                            <p className="text-green-600 font-bold">{attempt.correct_answers}</p>
                            <p className="text-gray-500">Correctes</p>
                          </div>
                          <div className="bg-red-50 rounded-lg py-2">
                            <p className="text-red-600 font-bold">{attempt.wrong_answers}</p>
                            <p className="text-gray-500">Incorrectes</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg py-2">
                            <p className="text-gray-600 font-bold">{attempt.unanswered}</p>
                            <p className="text-gray-500">Sans reponse</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Onglet Statistiques */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Vos statistiques
              </h2>

              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                </div>
              ) : !stats || stats.totalAttempts === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Pas encore de statistiques</p>
                  <p className="text-sm text-gray-400 mt-1">Passez votre premier QCM pour voir vos stats</p>
                </div>
              ) : (
                <>
                  {/* Cartes de statistiques principales */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                      <div className="flex items-center justify-between">
                        <Target className="w-8 h-8 opacity-80" />
                        <span className="text-3xl font-bold">{stats.totalAttempts}</span>
                      </div>
                      <p className="text-green-100 text-sm mt-2">QCM passes</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                      <div className="flex items-center justify-between">
                        <TrendingUp className="w-8 h-8 opacity-80" />
                        <span className="text-3xl font-bold">{stats.averageScore}%</span>
                      </div>
                      <p className="text-blue-100 text-sm mt-2">Moyenne</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-4 text-white">
                      <div className="flex items-center justify-between">
                        <Trophy className="w-8 h-8 opacity-80" />
                        <span className="text-3xl font-bold">{stats.bestScore}%</span>
                      </div>
                      <p className="text-yellow-100 text-sm mt-2">Meilleur score</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                      <div className="flex items-center justify-between">
                        <Zap className="w-8 h-8 opacity-80" />
                        <span className="text-2xl font-bold">{formatDuration(stats.totalTime)}</span>
                      </div>
                      <p className="text-purple-100 text-sm mt-2">Temps total</p>
                    </div>
                  </div>

                  {/* Informations supplémentaires */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    {stats.lastAttemptDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Derniere activite
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatRelativeDate(stats.lastAttemptDate)}
                        </span>
                      </div>
                    )}
                    {stats.favoriteCategory && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Concours prefere
                        </span>
                        <span className="font-medium text-gray-900">
                          {stats.favoriteCategory.split(' - ')[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Barre de progression globale */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Performance globale</span>
                      <span className="text-sm font-bold text-green-600">{stats.averageScore}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          stats.averageScore >= 70 ? 'bg-green-500' :
                          stats.averageScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(stats.averageScore, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {stats.averageScore >= 70 
                        ? 'Excellent ! Continuez comme ca !' 
                        : stats.averageScore >= 50 
                          ? 'Bon travail, vous progressez !'
                          : 'Continuez a vous entrainer !'}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer avec bouton déconnexion */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            Se deconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
