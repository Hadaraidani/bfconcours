// Arrière-plan éducatif simple et professionnel
export function HeroBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Fond dégradé principal */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-amber-50" />
      
      {/* Motifs géométriques subtils - livres, crayons stylisés */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="education-pattern" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
              {/* Livre ouvert */}
              <path d="M20 30 L30 25 L30 45 L20 50 Z" fill="#059669" />
              <path d="M30 25 L40 30 L40 50 L30 45 Z" fill="#10b981" />
              <line x1="25" y1="32" x2="25" y2="45" stroke="#059669" strokeWidth="0.5" />
              <line x1="35" y1="32" x2="35" y2="45" stroke="#10b981" strokeWidth="0.5" />
              
              {/* Chapeau de diplômé */}
              <polygon points="80,25 65,35 80,32 95,35" fill="#059669" />
              <rect x="75" y="32" width="10" height="3" fill="#10b981" />
              <line x1="90" y1="35" x2="95" y2="45" stroke="#f59e0b" strokeWidth="1.5" />
              <circle cx="95" cy="47" r="2" fill="#f59e0b" />
              
              {/* Crayon */}
              <rect x="15" y="75" width="25" height="6" rx="1" fill="#fbbf24" />
              <polygon points="40,75 45,78 40,81" fill="#f59e0b" />
              <rect x="15" y="75" width="5" height="6" fill="#10b981" />
              
              {/* Étoile de réussite */}
              <polygon points="85,80 87,86 93,86 88,90 90,96 85,92 80,96 82,90 77,86 83,86" fill="#f59e0b" />
              
              {/* Atome / Science */}
              <ellipse cx="60" cy="60" rx="15" ry="5" fill="none" stroke="#059669" strokeWidth="0.8" transform="rotate(-30 60 60)" />
              <ellipse cx="60" cy="60" rx="15" ry="5" fill="none" stroke="#059669" strokeWidth="0.8" transform="rotate(30 60 60)" />
              <ellipse cx="60" cy="60" rx="15" ry="5" fill="none" stroke="#059669" strokeWidth="0.8" transform="rotate(90 60 60)" />
              <circle cx="60" cy="60" r="3" fill="#10b981" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#education-pattern)" />
        </svg>
      </div>
      
      {/* Cercles décoratifs flous */}
      <div 
        className="absolute top-10 left-10 w-64 h-64 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" 
        style={{ animationDuration: '8s' }} 
      />
      <div 
        className="absolute top-1/3 right-10 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" 
        style={{ animationDuration: '10s', animationDelay: '2s' }} 
      />
      <div 
        className="absolute bottom-20 left-1/4 w-80 h-80 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" 
        style={{ animationDuration: '12s', animationDelay: '4s' }} 
      />
      
      {/* Lignes décoratives subtiles */}
      <div className="absolute inset-0 opacity-[0.02]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-lines" width="50" height="50" patternUnits="userSpaceOnUse">
              <line x1="0" y1="50" x2="50" y2="50" stroke="#059669" strokeWidth="0.5" />
              <line x1="50" y1="0" x2="50" y2="50" stroke="#059669" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-lines)" />
        </svg>
      </div>
      
      {/* Bordure décorative en bas */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 opacity-30" />
    </div>
  );
}
