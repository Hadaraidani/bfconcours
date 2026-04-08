import { Theme } from '../types';
import { THEME_CONFIG } from '../config/site';
import { User, LogIn, LogOut } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

interface HeaderProps {
  theme: Theme;
  onThemeChange?: (theme: Theme) => void;
  showThemeSelector?: boolean;
  isAuthenticated?: boolean;
  userName?: string;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  onProfileClick?: () => void;
}

export function Header({ 
  theme, 
  onThemeChange, 
  showThemeSelector = true,
  isAuthenticated = false,
  userName,
  onLoginClick,
  onLogoutClick,
  onProfileClick
}: HeaderProps) {

  const getGradientClass = () => {
    switch (theme) {
      case 'blue':
        return 'from-blue-700 via-blue-800 to-indigo-900';
      case 'purple':
        return 'from-purple-700 via-purple-800 to-violet-900';
      case 'orange':
        return 'from-orange-600 via-orange-700 to-amber-800';
      case 'red':
        return 'from-red-700 via-red-800 to-rose-900';
      default:
        return 'from-emerald-700 via-emerald-800 to-green-900';
    }
  };

  return (
    <header className="relative">
      {/* Gradient principal */}
      <div className={`bg-gradient-to-r ${getGradientClass()} text-white overflow-hidden`}>
        {/* Motifs décoratifs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        </div>

        {/* Contenu principal */}
        <div className="relative">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3 sm:py-4">
              {/* Logo et titre */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Logo */}
                <div className="relative">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-inner">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                      </svg>
                    </div>
                  </div>
                  {/* Badge Officiel */}
                  <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-yellow-400 text-yellow-900 text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-lg border border-yellow-300">
                    OFFICIEL
                  </div>
                </div>

                {/* Titre */}
                <div>
                  <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight">
                    QCM Concours <span className="hidden sm:inline">Burkina Faso</span><span className="sm:hidden">BF</span>
                  </h1>
                  <p className="text-[10px] sm:text-xs text-white/70 hidden sm:block">
                    Plateforme de préparation aux concours directs
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Sélecteur de thème de couleur */}
                {showThemeSelector && onThemeChange && (
                  <div className="relative hidden sm:block">
                    <select
                      value={theme}
                      onChange={(e) => onThemeChange(e.target.value as Theme)}
                      className="appearance-none bg-white/10 border-white/20 backdrop-blur-sm text-white text-xs sm:text-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer border"
                    >
                      {Object.entries(THEME_CONFIG).map(([key, config]) => (
                        <option key={key} value={key} className="text-gray-900">
                          {config.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Badge sécurisé */}
                <div className="hidden md:flex items-center space-x-1 sm:space-x-2 bg-white/10 border-white/20 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-[10px] sm:text-xs font-medium">
                    Sécurisé SSL
                  </span>
                </div>

                {/* Centre de notifications */}
                <NotificationCenter />

                {/* Boutons Auth */}
                {isAuthenticated ? (
                  <div className="flex items-center space-x-2">
                    {/* Profil utilisateur */}
                    <button
                      onClick={onProfileClick}
                      className="flex items-center space-x-1 sm:space-x-2 bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border transition-colors"
                    >
                      <div className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="hidden sm:inline text-xs font-medium truncate max-w-[100px]">
                        {userName || 'Mon compte'}
                      </span>
                    </button>
                    {/* Déconnexion */}
                    <button
                      onClick={onLogoutClick}
                      className="flex items-center space-x-1 bg-red-500/20 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-red-400/30 hover:bg-red-500/30 transition-colors"
                      title="Se déconnecter"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:inline text-xs font-medium">Déconnexion</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onLoginClick}
                    className="flex items-center space-x-1 sm:space-x-2 bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="text-xs font-medium">Connexion</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Ligne décorative */}
          <div className="h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 opacity-80"></div>
        </div>

        {/* Barre secondaire */}
        <div className="bg-black/20 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2">
            <div className="flex items-center justify-between text-[10px] sm:text-xs">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    {/* Drapeau du Burkina Faso: Rouge en haut, Vert en bas, Etoile jaune au centre */}
                    <rect y="0" width="24" height="12" fill="#EF4444"/>
                    <rect y="12" width="24" height="12" fill="#22C55E"/>
                    <polygon points="12,6 13.5,10.5 18,10.5 14.5,13.5 16,18 12,15 8,18 9.5,13.5 6,10.5 10.5,10.5" fill="#FBBF24"/>
                  </svg>
                  <span className="text-white/80">Burkina Faso</span>
                </span>
                <span className="hidden sm:flex items-center space-x-1 text-white/60">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Disponible 24h/24</span>
                </span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="bg-yellow-500/20 text-yellow-200 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium">
                  Édition {new Date().getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
