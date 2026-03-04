import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  UserPlus,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Check,
  X
} from 'lucide-react';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
  onBack: () => void;
  onSuccess: () => void;
}

export function RegisterPage({ onSwitchToLogin, onBack, onSuccess }: RegisterPageProps) {
  const { signUp } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Validation du mot de passe
  const passwordChecks = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== '';

  // Traduire les erreurs Supabase
  const translateError = (error: any): string => {
    const message = error?.message || error?.toString() || 'Erreur inconnue';

    const translations: Record<string, string> = {
      'User already registered': 'Un compte existe déjà avec cet email',
      'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères',
      'Invalid email': 'Adresse email invalide',
      'Signup requires a valid password': 'Veuillez entrer un mot de passe valide',
      'Email rate limit exceeded': 'Trop de tentatives. Veuillez réessayer plus tard',
      'Network error': 'Erreur de connexion. Vérifiez votre connexion internet',
    };

    for (const [key, translation] of Object.entries(translations)) {
      if (message.toLowerCase().includes(key.toLowerCase())) {
        return translation;
      }
    }

    return message;
  };

  // Gestion des changements de champs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  // Gestion de l'inscription
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validations
    if (!formData.fullName.trim()) {
      setError('Veuillez entrer votre nom complet');
      return;
    }
    if (!formData.email.trim()) {
      setError('Veuillez entrer votre email');
      return;
    }
    if (!isPasswordValid) {
      setError('Le mot de passe ne respecte pas les critères de sécurité');
      return;
    }
    if (!passwordsMatch) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (!acceptTerms) {
      setError('Veuillez accepter les conditions d\'utilisation');
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(formData.email, formData.password, formData.fullName, formData.phone || undefined);
      
      if (result.success) {
        setSuccess(result.message || 'Inscription réussie !');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setError(result.message || 'Erreur lors de l\'inscription');
      }
    } catch (err: any) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  // Composant pour les critères de mot de passe
  const PasswordCriteria = ({ met, label }: { met: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-sm ${met ? 'text-green-600' : 'text-gray-400'}`}>
      {met ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      <span>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50 flex items-center justify-center p-4 py-8">
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
              <UserPlus className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">Créer un compte</h1>
            <p className="text-green-100 mt-2">Rejoignez notre plateforme de QCM</p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Messages */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            {/* Nom complet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Jean Dupont"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="votre@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+226 70 00 00 00"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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

              {/* Critères de mot de passe */}
              {formData.password && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-1">
                  <PasswordCriteria met={passwordChecks.length} label="Au moins 8 caractères" />
                  <PasswordCriteria met={passwordChecks.uppercase} label="Une lettre majuscule" />
                  <PasswordCriteria met={passwordChecks.lowercase} label="Une lettre minuscule" />
                  <PasswordCriteria met={passwordChecks.number} label="Un chiffre" />
                </div>
              )}
            </div>

            {/* Confirmer mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirmez votre mot de passe"
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all ${
                    formData.confirmPassword
                      ? passwordsMatch
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && !passwordsMatch && (
                <p className="text-red-500 text-sm mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            {/* Conditions d'utilisation */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-600">
                J'accepte les{' '}
                <a href="#" className="text-green-600 hover:underline">
                  conditions d'utilisation
                </a>{' '}
                et la{' '}
                <a href="#" className="text-green-600 hover:underline">
                  politique de confidentialité
                </a>
              </label>
            </div>

            {/* Bouton d'inscription */}
            <button
              type="submit"
              disabled={loading || !isPasswordValid || !passwordsMatch || !acceptTerms}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Inscription en cours...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  S'inscrire
                </>
              )}
            </button>

            {/* Lien vers connexion */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-gray-600">
                Déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-green-600 hover:text-green-700 font-semibold"
                >
                  Se connecter
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
