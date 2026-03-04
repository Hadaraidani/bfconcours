import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle, 
  CheckCircle,
  ArrowLeft,
  Loader2
} from 'lucide-react';

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onBack: () => void;
  onSuccess: () => void;
}

export function LoginPage({ onSwitchToRegister, onBack, onSuccess }: LoginPageProps) {
  const { signIn, resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Traduire les erreurs Supabase
  const translateError = (error: any): string => {
    const message = error?.message || error?.toString() || 'Erreur inconnue';
    
    const translations: Record<string, string> = {
      'Invalid login credentials': 'Email ou mot de passe incorrect',
      'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter',
      'User not found': 'Aucun compte associé à cet email',
      'Invalid email': 'Adresse email invalide',
      'Too many requests': 'Trop de tentatives. Veuillez réessayer plus tard',
      'Network error': 'Erreur de connexion. Vérifiez votre connexion internet',
    };

    for (const [key, translation] of Object.entries(translations)) {
      if (message.toLowerCase().includes(key.toLowerCase())) {
        return translation;
      }
    }

    return message;
  };

  // Gestion de la connexion
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!email.trim()) {
      setError('Veuillez entrer votre email');
      return;
    }
    if (!password) {
      setError('Veuillez entrer votre mot de passe');
      return;
    }

    setLoading(true);

    try {
      const result = await signIn(email, password);
      
      if (result.success) {
        setSuccess(result.message || 'Connexion réussie !');
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        setError(result.message || 'Erreur lors de la connexion');
      }
    } catch (err: any) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  // Gestion de la réinitialisation du mot de passe
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!resetEmail.trim()) {
      setError('Veuillez entrer votre email');
      return;
    }

    setResetLoading(true);

    try {
      const result = await resetPassword(resetEmail);
      
      if (result.success) {
        setSuccess(result.message || 'Un email de réinitialisation a été envoyé à votre adresse');
        setShowResetPassword(false);
      } else {
        setError(result.message || 'Erreur lors de l\'envoi');
      }
    } catch (err: any) {
      setError(translateError(err));
    } finally {
      setResetLoading(false);
    }
  };

  // Formulaire de réinitialisation du mot de passe
  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-8 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
              <p className="text-green-100 mt-2">Entrez votre email pour réinitialiser</p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleResetPassword} className="p-6 space-y-6">
              {/* Messages */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{success}</span>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Boutons */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Envoyer le lien
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowResetPassword(false)}
                  className="w-full flex items-center justify-center gap-2 text-gray-600 py-3 rounded-lg font-medium hover:bg-gray-100 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Retour à la connexion
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Bouton retour */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour à l'accueil
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-8 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">Connexion</h1>
            <p className="text-green-100 mt-2">Accédez à votre espace candidat</p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Messages */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Mot de passe oublié */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Se connecter
                </>
              )}
            </button>

            {/* Lien vers inscription */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-gray-600">
                Pas encore de compte ?{' '}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-green-600 hover:text-green-700 font-semibold"
                >
                  S'inscrire
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
