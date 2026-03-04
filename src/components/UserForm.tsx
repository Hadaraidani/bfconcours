import { useState } from 'react';
import { UserInfo, Theme } from '../types';

interface UserFormProps {
  onSubmit: (userInfo: UserInfo) => void;
  onBack: () => void;
  theme: Theme;
}

export function UserForm({ onSubmit, onBack, theme }: UserFormProps) {
  const [formData, setFormData] = useState<UserInfo>({
    nom: '',
    prenom: '',
    telephone: '',
  });
  const [errors, setErrors] = useState<Partial<UserInfo>>({});

  const getThemeColors = () => {
    switch (theme) {
      case 'blue':
        return { button: 'bg-blue-600 hover:bg-blue-700', focus: 'focus:ring-blue-500 focus:border-blue-500' };
      case 'purple':
        return { button: 'bg-purple-600 hover:bg-purple-700', focus: 'focus:ring-purple-500 focus:border-purple-500' };
      case 'orange':
        return { button: 'bg-orange-600 hover:bg-orange-700', focus: 'focus:ring-orange-500 focus:border-orange-500' };
      case 'red':
        return { button: 'bg-red-600 hover:bg-red-700', focus: 'focus:ring-red-500 focus:border-red-500' };
      default:
        return { button: 'bg-emerald-600 hover:bg-emerald-700', focus: 'focus:ring-emerald-500 focus:border-emerald-500' };
    }
  };

  const colors = getThemeColors();

  // Sanitize input to prevent XSS
  const sanitizeInput = (input: string): string => {
    return input.replace(/<[^>]*>/g, '').trim();
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<UserInfo> = {};

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    } else if (formData.nom.length < 2) {
      newErrors.nom = 'Le nom doit contenir au moins 2 caractères';
    }

    if (!formData.prenom.trim()) {
      newErrors.prenom = 'Le prénom est requis';
    } else if (formData.prenom.length < 2) {
      newErrors.prenom = 'Le prénom doit contenir au moins 2 caractères';
    }

    if (!formData.telephone.trim()) {
      newErrors.telephone = 'Le numéro de téléphone est requis';
    } else if (!/^[0-9+\s-]{8,15}$/.test(formData.telephone)) {
      newErrors.telephone = 'Numéro de téléphone invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        nom: sanitizeInput(formData.nom),
        prenom: sanitizeInput(formData.prenom),
        telephone: sanitizeInput(formData.telephone),
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof UserInfo]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 sm:py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Bouton retour */}
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Retour</span>
        </button>

        {/* Card du formulaire */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Identification</h2>
            <p className="text-sm sm:text-base text-gray-500 mt-2">
              Veuillez remplir vos informations pour commencer le QCM
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Nom */}
            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-xl ${colors.focus} focus:ring-2 focus:outline-none transition-colors text-base ${
                  errors.nom ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Votre nom"
              />
              {errors.nom && (
                <p className="mt-1 text-sm text-red-500 flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{errors.nom}</span>
                </p>
              )}
            </div>

            {/* Prénom */}
            <div>
              <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-1">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="prenom"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-xl ${colors.focus} focus:ring-2 focus:outline-none transition-colors text-base ${
                  errors.prenom ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Votre prénom"
              />
              {errors.prenom && (
                <p className="mt-1 text-sm text-red-500 flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{errors.prenom}</span>
                </p>
              )}
            </div>

            {/* Téléphone */}
            <div>
              <label htmlFor="telephone" className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-xl ${colors.focus} focus:ring-2 focus:outline-none transition-colors text-base ${
                  errors.telephone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="+226 70 00 00 00"
              />
              {errors.telephone && (
                <p className="mt-1 text-sm text-red-500 flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{errors.telephone}</span>
                </p>
              )}
            </div>

            {/* Bouton submit */}
            <button
              type="submit"
              className={`w-full ${colors.button} text-white font-semibold py-3 sm:py-4 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2 text-base sm:text-lg mt-6`}
            >
              <span>Commencer le QCM</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </form>

          {/* Note de confidentialité */}
          <div className="mt-6 p-3 sm:p-4 bg-gray-50 rounded-xl">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-xs sm:text-sm text-gray-500">
                Vos informations sont protégées et utilisées uniquement pour l'identification de votre copie.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
