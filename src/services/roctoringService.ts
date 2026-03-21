/**
 * SERVICE DE PROCTORING AVANCÉ
 * 
 * Fonctionnalités :
 * - Détection de changement d'onglet (PÉNALITÉ GRAVE : -3 points par occurrence)
 * - Blocage du copier-coller (-1 point)
 * - Protection contre l'inspection du code source
 * - Détection des raccourcis suspects (-2 points)
 * - Score de confiance basé sur les violations
 * - Pénalités de points directes sur le score final
 * - Combinaison secrète pour accéder aux outils de développement
 */

// ============================================================
// CONFIGURATION DE LA COMBINAISON SECRÈTE
// ============================================================
// Pour accéder aux outils de développement, tapez cette séquence :
// Modifiez cette combinaison pour votre propre sécurité !
const SECRET_COMBINATION = ['Control', 'Shift', 'Alt', 'D', 'E', 'V'];
let secretKeySequence: string[] = [];
let secretTimeout: number | null = null;

// ============================================================
// TYPES
// ============================================================
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'grave';

export interface ProctoringAlert {
  id: string;
  type: AlertSeverity;
  event: string;
  message: string;
  timestamp: Date;
  pointsPenalty: number;
  explanation: string;
}

export interface ProctoringSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  alerts: ProctoringAlert[];
  trustScore: number;
  totalPointsPenalty: number;
  tabSwitchCount: number;
  copyAttempts: number;
  pasteAttempts: number;
  keyboardShortcuts: number;
  fullscreenExits: number;
  rightClickAttempts: number;
  inspectAttempts: number;
  isFullscreen: boolean;
  isActive: boolean;
  devToolsUnlocked: boolean;
}

export interface ProctoringConfig {
  enableTabDetection: boolean;
  enableCopyPasteBlock: boolean;
  enableFullscreenMode: boolean;
  enableKeyboardDetection: boolean;
  enableInspectProtection: boolean;
  maxTabSwitches: number;
  onAlert?: (alert: ProctoringAlert) => void;
  onTrustScoreChange?: (score: number) => void;
  onPointsPenaltyChange?: (penalty: number) => void;
  onSessionEnd?: (session: ProctoringSession) => void;
}

export interface PenaltySummary {
  category: string;
  count: number;
  pointsPerOccurrence: number;
  totalPoints: number;
  severity: AlertSeverity;
  explanation: string;
}

// ============================================================
// CONFIGURATION DES PÉNALITÉS
// ============================================================
const PENALTIES = {
  tabSwitch: {
    points: -3,
    severity: 'grave' as AlertSeverity,
    message: 'Changement d\'onglet détecté',
    explanation: 'Quitter la page d\'examen est considéré comme une tentative de triche grave. Cette action suggère que vous cherchez des réponses ailleurs.'
  },
  windowBlur: {
    points: -2,
    severity: 'critical' as AlertSeverity,
    message: 'Perte de focus de la fenêtre',
    explanation: 'La fenêtre a perdu le focus, ce qui peut indiquer l\'utilisation d\'une autre application.'
  },
  copyAttempt: {
    points: -1,
    severity: 'warning' as AlertSeverity,
    message: 'Tentative de copie bloquée',
    explanation: 'Copier du contenu de l\'examen est interdit pour éviter le partage des questions.'
  },
  pasteAttempt: {
    points: -1,
    severity: 'warning' as AlertSeverity,
    message: 'Tentative de collage bloquée',
    explanation: 'Coller du contenu suggère l\'utilisation de réponses préparées à l\'avance.'
  },
  cutAttempt: {
    points: -1,
    severity: 'warning' as AlertSeverity,
    message: 'Tentative de couper bloquée',
    explanation: 'Couper du contenu est interdit pendant l\'examen.'
  },
  devTools: {
    points: -5,
    severity: 'grave' as AlertSeverity,
    message: 'Tentative d\'accès aux outils de développement',
    explanation: 'Tenter d\'accéder aux outils de développement pour voir le code source est une violation grave de l\'intégrité de l\'examen.'
  },
  viewSource: {
    points: -5,
    severity: 'grave' as AlertSeverity,
    message: 'Tentative de voir le code source',
    explanation: 'Essayer de voir le code source de la page pour trouver les réponses est strictement interdit.'
  },
  printPage: {
    points: -2,
    severity: 'critical' as AlertSeverity,
    message: 'Tentative d\'impression',
    explanation: 'L\'impression des questions d\'examen est interdite.'
  },
  savePage: {
    points: -2,
    severity: 'critical' as AlertSeverity,
    message: 'Tentative de sauvegarde',
    explanation: 'Sauvegarder la page d\'examen est interdit.'
  },
  rightClick: {
    points: -1,
    severity: 'warning' as AlertSeverity,
    message: 'Clic droit bloqué',
    explanation: 'Le menu contextuel est désactivé pour empêcher l\'accès au code source.'
  },
  fullscreenExit: {
    points: -2,
    severity: 'critical' as AlertSeverity,
    message: 'Sortie du mode plein écran',
    explanation: 'Quitter le mode plein écran peut indiquer une tentative d\'accès à d\'autres applications.'
  },
  refreshAttempt: {
    points: -1,
    severity: 'warning' as AlertSeverity,
    message: 'Tentative de rafraîchissement',
    explanation: 'Rafraîchir la page pendant l\'examen n\'est pas autorisé.'
  }
};

// ============================================================
// ÉTAT GLOBAL
// ============================================================
let currentSession: ProctoringSession | null = null;
let config: ProctoringConfig = {
  enableTabDetection: true,
  enableCopyPasteBlock: true,
  enableFullscreenMode: true,
  enableKeyboardDetection: true,
  enableInspectProtection: true,
  maxTabSwitches: 3,
};

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Calculer le score de confiance (0-100)
const calculateTrustScore = (session: ProctoringSession): number => {
  let score = 100;
  
  // Changement d'onglet est très grave
  score -= session.tabSwitchCount * 15;
  
  // Autres violations
  score -= session.copyAttempts * 5;
  score -= session.pasteAttempts * 5;
  score -= session.keyboardShortcuts * 10;
  score -= session.fullscreenExits * 10;
  score -= session.rightClickAttempts * 3;
  score -= session.inspectAttempts * 20;
  
  return Math.max(0, Math.min(100, score));
};

// Calculer la pénalité totale de points
const calculateTotalPenalty = (session: ProctoringSession): number => {
  return session.alerts.reduce((total, alert) => total + alert.pointsPenalty, 0);
};

// ============================================================
// GESTION DES ALERTES
// ============================================================
const addAlert = (
  type: AlertSeverity,
  event: string,
  message: string,
  pointsPenalty: number,
  explanation: string
): void => {
  if (!currentSession) return;
  
  const alert: ProctoringAlert = {
    id: generateId(),
    type,
    event,
    message,
    timestamp: new Date(),
    pointsPenalty,
    explanation,
  };
  
  currentSession.alerts.push(alert);
  currentSession.totalPointsPenalty = calculateTotalPenalty(currentSession);
  currentSession.trustScore = calculateTrustScore(currentSession);
  
  // Callbacks
  if (config.onAlert) {
    config.onAlert(alert);
  }
  if (config.onTrustScoreChange) {
    config.onTrustScoreChange(currentSession.trustScore);
  }
  if (config.onPointsPenaltyChange) {
    config.onPointsPenaltyChange(currentSession.totalPointsPenalty);
  }
  
  // Log coloré selon la gravité
  const colors: Record<AlertSeverity, string> = {
    info: '🔵',
    warning: '🟡',
    critical: '🟠',
    grave: '🔴'
  };
  
  console.log(`${colors[type]} PROCTORING [${type.toUpperCase()}]: ${message} (${pointsPenalty} points)`);
};

// ============================================================
// VÉRIFICATION DE LA COMBINAISON SECRÈTE
// ============================================================
const checkSecretCombination = (key: string): boolean => {
  secretKeySequence.push(key);
  
  // Réinitialiser après 3 secondes d'inactivité
  if (secretTimeout) {
    clearTimeout(secretTimeout);
  }
  secretTimeout = window.setTimeout(() => {
    secretKeySequence = [];
  }, 3000);
  
  // Vérifier si la séquence correspond
  const sequenceStr = secretKeySequence.join('+');
  const secretStr = SECRET_COMBINATION.join('+');
  
  if (sequenceStr === secretStr) {
    if (currentSession) {
      currentSession.devToolsUnlocked = true;
    }
    console.log('🔓 Outils de développement déverrouillés');
    secretKeySequence = [];
    return true;
  }
  
  // Réinitialiser si la séquence devient trop longue
  if (secretKeySequence.length > SECRET_COMBINATION.length) {
    secretKeySequence = secretKeySequence.slice(-SECRET_COMBINATION.length);
  }
  
  return false;
};

// ============================================================
// GESTIONNAIRES D'ÉVÉNEMENTS
// ============================================================

// Changement de visibilité (onglet) - TRÈS GRAVE
const handleVisibilityChange = (): void => {
  if (!currentSession || !config.enableTabDetection) return;
  
  if (document.hidden) {
    currentSession.tabSwitchCount++;
    
    const penalty = PENALTIES.tabSwitch;
    const isMaxReached = currentSession.tabSwitchCount >= config.maxTabSwitches;
    
    addAlert(
      penalty.severity,
      'tab_switch',
      `${penalty.message} (${currentSession.tabSwitchCount}/${config.maxTabSwitches})${isMaxReached ? ' - LIMITE ATTEINTE!' : ''}`,
      penalty.points,
      penalty.explanation + (isMaxReached ? ' Vous avez atteint la limite maximale de changements d\'onglet autorisés.' : '')
    );
    
    // Alerte visuelle pour l'utilisateur
    if (isMaxReached) {
      alert('⚠️ ATTENTION: Vous avez atteint la limite de changements d\'onglet!\n\nVotre score sera fortement pénalisé.\n\nTout nouveau changement d\'onglet pourrait entraîner la disqualification.');
    }
  }
};

// Perte de focus de la fenêtre
const handleWindowBlur = (): void => {
  if (!currentSession || !config.enableTabDetection) return;
  
  const penalty = PENALTIES.windowBlur;
  
  addAlert(
    penalty.severity,
    'window_blur',
    penalty.message,
    penalty.points,
    penalty.explanation
  );
};

// Tentative de copie
const handleCopy = (e: ClipboardEvent): void => {
  if (!currentSession || !config.enableCopyPasteBlock) return;
  
  e.preventDefault();
  e.stopPropagation();
  currentSession.copyAttempts++;
  
  const penalty = PENALTIES.copyAttempt;
  
  addAlert(
    penalty.severity,
    'copy_attempt',
    `${penalty.message} (${currentSession.copyAttempts} fois)`,
    penalty.points,
    penalty.explanation
  );
};

// Tentative de collage
const handlePaste = (e: ClipboardEvent): void => {
  if (!currentSession || !config.enableCopyPasteBlock) return;
  
  e.preventDefault();
  e.stopPropagation();
  currentSession.pasteAttempts++;
  
  const penalty = PENALTIES.pasteAttempt;
  
  addAlert(
    penalty.severity,
    'paste_attempt',
    `${penalty.message} (${currentSession.pasteAttempts} fois)`,
    penalty.points,
    penalty.explanation
  );
};

// Tentative de couper
const handleCut = (e: ClipboardEvent): void => {
  if (!currentSession || !config.enableCopyPasteBlock) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const penalty = PENALTIES.cutAttempt;
  
  addAlert(
    penalty.severity,
    'cut_attempt',
    penalty.message,
    penalty.points,
    penalty.explanation
  );
};

// Raccourcis clavier - PROTECTION RENFORCÉE
const handleKeyDown = (e: KeyboardEvent): void => {
  if (!currentSession || !config.enableKeyboardDetection) return;
  
  // Vérifier d'abord la combinaison secrète
  if (checkSecretCombination(e.key)) {
    return; // Combinaison correcte, autoriser
  }
  
  // Si les outils sont déverrouillés, ne pas bloquer
  if (currentSession.devToolsUnlocked) {
    return;
  }
  
  const key = e.key.toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;
  const alt = e.altKey;
  
  // Liste des touches/combinaisons bloquées
  const blockedActions: { condition: boolean; penalty: typeof PENALTIES.devTools; event: string }[] = [
    // Outils de développement
    { condition: key === 'f12', penalty: PENALTIES.devTools, event: 'devtools_f12' },
    { condition: ctrl && shift && key === 'i', penalty: PENALTIES.devTools, event: 'devtools_ctrl_shift_i' },
    { condition: ctrl && shift && key === 'j', penalty: PENALTIES.devTools, event: 'devtools_ctrl_shift_j' },
    { condition: ctrl && shift && key === 'c', penalty: PENALTIES.devTools, event: 'devtools_ctrl_shift_c' },
    { condition: ctrl && shift && key === 'k', penalty: PENALTIES.devTools, event: 'devtools_ctrl_shift_k' },
    { condition: ctrl && alt && key === 'i', penalty: PENALTIES.devTools, event: 'devtools_ctrl_alt_i' },
    
    // Code source
    { condition: ctrl && key === 'u', penalty: PENALTIES.viewSource, event: 'view_source' },
    { condition: ctrl && key === 's', penalty: PENALTIES.savePage, event: 'save_page' },
    
    // Impression
    { condition: ctrl && key === 'p', penalty: PENALTIES.printPage, event: 'print_page' },
    
    // Rafraîchissement
    { condition: key === 'f5', penalty: PENALTIES.refreshAttempt, event: 'refresh_f5' },
    { condition: ctrl && key === 'r', penalty: PENALTIES.refreshAttempt, event: 'refresh_ctrl_r' },
    
    // Recherche dans la page (peut révéler des infos)
    { condition: ctrl && key === 'f', penalty: { ...PENALTIES.copyAttempt, message: 'Recherche dans la page bloquée', explanation: 'La fonction de recherche est désactivée pendant l\'examen.' }, event: 'find_ctrl_f' },
  ];
  
  for (const action of blockedActions) {
    if (action.condition) {
      e.preventDefault();
      e.stopPropagation();
      currentSession.keyboardShortcuts++;
      
      if (action.penalty === PENALTIES.devTools || action.penalty === PENALTIES.viewSource) {
        currentSession.inspectAttempts++;
      }
      
      addAlert(
        action.penalty.severity,
        action.event,
        action.penalty.message,
        action.penalty.points,
        action.penalty.explanation
      );
      return;
    }
  }
};

// Clic droit
const handleContextMenu = (e: MouseEvent): void => {
  if (!currentSession || !config.enableInspectProtection) return;
  
  // Si déverrouillé, autoriser
  if (currentSession.devToolsUnlocked) return;
  
  e.preventDefault();
  e.stopPropagation();
  currentSession.rightClickAttempts++;
  
  const penalty = PENALTIES.rightClick;
  
  addAlert(
    penalty.severity,
    'right_click',
    `${penalty.message} (${currentSession.rightClickAttempts} fois)`,
    penalty.points,
    penalty.explanation
  );
};

// Changement de plein écran
const handleFullscreenChange = (): void => {
  if (!currentSession || !config.enableFullscreenMode) return;
  
  const isFullscreen = !!document.fullscreenElement;
  
  if (currentSession.isFullscreen && !isFullscreen) {
    currentSession.fullscreenExits++;
    
    const penalty = PENALTIES.fullscreenExit;
    
    addAlert(
      penalty.severity,
      'fullscreen_exit',
      `${penalty.message} (${currentSession.fullscreenExits} fois)`,
      penalty.points,
      penalty.explanation
    );
    
    // Demander de revenir en plein écran
    setTimeout(() => {
      if (currentSession && currentSession.isActive) {
        requestFullscreen();
      }
    }, 1000);
  }
  
  currentSession.isFullscreen = isFullscreen;
};

// Bloquer la sélection de texte
const handleSelectStart = (e: Event): void => {
  if (!currentSession || !config.enableCopyPasteBlock) return;
  if (currentSession.devToolsUnlocked) return;
  
  // Autoriser la sélection des options de réponse (boutons radio, etc.)
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'LABEL' || target.tagName === 'BUTTON') {
    return;
  }
  
  e.preventDefault();
};

// Bloquer le glisser-déposer
const handleDragStart = (e: DragEvent): void => {
  if (!currentSession || !config.enableCopyPasteBlock) return;
  if (currentSession.devToolsUnlocked) return;
  
  e.preventDefault();
};

// ============================================================
// FONCTIONS PUBLIQUES
// ============================================================

// Demander le plein écran
export const requestFullscreen = async (): Promise<boolean> => {
  try {
    const elem = document.documentElement;
    
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      await (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      await (elem as any).msRequestFullscreen();
    }
    
    if (currentSession) {
      currentSession.isFullscreen = true;
    }
    
    return true;
  } catch (error) {
    console.warn('Impossible de passer en plein écran:', error);
    return false;
  }
};

// Quitter le plein écran
export const exitFullscreen = async (): Promise<void> => {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen();
    }
  } catch (error) {
    console.warn('Erreur lors de la sortie du plein écran:', error);
  }
};

// Démarrer une session de proctoring
export const startProctoringSession = (customConfig?: Partial<ProctoringConfig>): ProctoringSession => {
  // Fusionner la configuration
  config = { ...config, ...customConfig };
  
  // Réinitialiser la séquence secrète
  secretKeySequence = [];
  
  // Créer une nouvelle session
  currentSession = {
    id: generateId(),
    startTime: new Date(),
    alerts: [],
    trustScore: 100,
    totalPointsPenalty: 0,
    tabSwitchCount: 0,
    copyAttempts: 0,
    pasteAttempts: 0,
    keyboardShortcuts: 0,
    fullscreenExits: 0,
    rightClickAttempts: 0,
    inspectAttempts: 0,
    isFullscreen: false,
    isActive: true,
    devToolsUnlocked: false,
  };
  
  // Ajouter les écouteurs d'événements
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleWindowBlur);
  document.addEventListener('copy', handleCopy, true);
  document.addEventListener('paste', handlePaste, true);
  document.addEventListener('cut', handleCut, true);
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('contextmenu', handleContextMenu, true);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('selectstart', handleSelectStart);
  document.addEventListener('dragstart', handleDragStart);
  
  // Demander le plein écran si activé
  if (config.enableFullscreenMode) {
    requestFullscreen();
  }
  
  addAlert('info', 'session_start', 'Session de surveillance démarrée', 0, 'La session d\'examen surveillé a commencé. Restez concentré sur l\'examen.');
  
  console.log('🔒 Proctoring: Session démarrée', currentSession.id);
  
  return currentSession;
};

// Terminer la session de proctoring
export const endProctoringSession = (): ProctoringSession | null => {
  if (!currentSession) return null;
  
  // Marquer la fin de session
  currentSession.endTime = new Date();
  currentSession.isActive = false;
  currentSession.trustScore = calculateTrustScore(currentSession);
  currentSession.totalPointsPenalty = calculateTotalPenalty(currentSession);
  
  // Supprimer les écouteurs d'événements
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('blur', handleWindowBlur);
  document.removeEventListener('copy', handleCopy, true);
  document.removeEventListener('paste', handlePaste, true);
  document.removeEventListener('cut', handleCut, true);
  document.removeEventListener('keydown', handleKeyDown, true);
  document.removeEventListener('contextmenu', handleContextMenu, true);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('selectstart', handleSelectStart);
  document.removeEventListener('dragstart', handleDragStart);
  
  // Quitter le plein écran
  exitFullscreen();
  
  // Callback de fin de session
  if (config.onSessionEnd) {
    config.onSessionEnd(currentSession);
  }
  
  console.log('🔒 Proctoring: Session terminée', {
    id: currentSession.id,
    trustScore: currentSession.trustScore,
    totalPenalty: currentSession.totalPointsPenalty,
    alerts: currentSession.alerts.length,
  });
  
  const session = currentSession;
  currentSession = null;
  
  return session;
};

// Obtenir la session courante
export const getCurrentSession = (): ProctoringSession | null => {
  return currentSession;
};

// Obtenir le score de confiance actuel
export const getTrustScore = (): number => {
  return currentSession?.trustScore ?? 100;
};

// Obtenir la pénalité totale de points
export const getTotalPointsPenalty = (): number => {
  return currentSession?.totalPointsPenalty ?? 0;
};

// Vérifier si le proctoring est actif
export const isProctoringActive = (): boolean => {
  return currentSession?.isActive ?? false;
};

// Obtenir les alertes de la session
export const getAlerts = (): ProctoringAlert[] => {
  return currentSession?.alerts ?? [];
};

// Obtenir un résumé détaillé des pénalités
export const getPenaltySummary = (): PenaltySummary[] => {
  if (!currentSession) return [];
  
  const summary: PenaltySummary[] = [];
  
  if (currentSession.tabSwitchCount > 0) {
    summary.push({
      category: 'Changements d\'onglet',
      count: currentSession.tabSwitchCount,
      pointsPerOccurrence: PENALTIES.tabSwitch.points,
      totalPoints: currentSession.tabSwitchCount * PENALTIES.tabSwitch.points,
      severity: 'grave',
      explanation: PENALTIES.tabSwitch.explanation
    });
  }
  
  if (currentSession.copyAttempts > 0) {
    summary.push({
      category: 'Tentatives de copie',
      count: currentSession.copyAttempts,
      pointsPerOccurrence: PENALTIES.copyAttempt.points,
      totalPoints: currentSession.copyAttempts * PENALTIES.copyAttempt.points,
      severity: 'warning',
      explanation: PENALTIES.copyAttempt.explanation
    });
  }
  
  if (currentSession.pasteAttempts > 0) {
    summary.push({
      category: 'Tentatives de collage',
      count: currentSession.pasteAttempts,
      pointsPerOccurrence: PENALTIES.pasteAttempt.points,
      totalPoints: currentSession.pasteAttempts * PENALTIES.pasteAttempt.points,
      severity: 'warning',
      explanation: PENALTIES.pasteAttempt.explanation
    });
  }
  
  if (currentSession.inspectAttempts > 0) {
    summary.push({
      category: 'Tentatives d\'inspection du code',
      count: currentSession.inspectAttempts,
      pointsPerOccurrence: PENALTIES.devTools.points,
      totalPoints: currentSession.inspectAttempts * PENALTIES.devTools.points,
      severity: 'grave',
      explanation: PENALTIES.devTools.explanation
    });
  }
  
  if (currentSession.fullscreenExits > 0) {
    summary.push({
      category: 'Sorties du plein écran',
      count: currentSession.fullscreenExits,
      pointsPerOccurrence: PENALTIES.fullscreenExit.points,
      totalPoints: currentSession.fullscreenExits * PENALTIES.fullscreenExit.points,
      severity: 'critical',
      explanation: PENALTIES.fullscreenExit.explanation
    });
  }
  
  if (currentSession.rightClickAttempts > 0) {
    summary.push({
      category: 'Clics droits',
      count: currentSession.rightClickAttempts,
      pointsPerOccurrence: PENALTIES.rightClick.points,
      totalPoints: currentSession.rightClickAttempts * PENALTIES.rightClick.points,
      severity: 'warning',
      explanation: PENALTIES.rightClick.explanation
    });
  }
  
  return summary;
};

// Obtenir un résumé de la session
export const getSessionSummary = (): {
  trustScore: number;
  totalPointsPenalty: number;
  tabSwitches: number;
  copyAttempts: number;
  pasteAttempts: number;
  keyboardShortcuts: number;
  fullscreenExits: number;
  rightClickAttempts: number;
  inspectAttempts: number;
  totalAlerts: number;
  criticalAlerts: number;
  graveAlerts: number;
  penaltySummary: PenaltySummary[];
} | null => {
  if (!currentSession) return null;
  
  return {
    trustScore: currentSession.trustScore,
    totalPointsPenalty: currentSession.totalPointsPenalty,
    tabSwitches: currentSession.tabSwitchCount,
    copyAttempts: currentSession.copyAttempts,
    pasteAttempts: currentSession.pasteAttempts,
    keyboardShortcuts: currentSession.keyboardShortcuts,
    fullscreenExits: currentSession.fullscreenExits,
    rightClickAttempts: currentSession.rightClickAttempts,
    inspectAttempts: currentSession.inspectAttempts,
    totalAlerts: currentSession.alerts.length,
    criticalAlerts: currentSession.alerts.filter(a => a.type === 'critical').length,
    graveAlerts: currentSession.alerts.filter(a => a.type === 'grave').length,
    penaltySummary: getPenaltySummary(),
  };
};

// Export par défaut
export default {
  startProctoringSession,
  endProctoringSession,
  getCurrentSession,
  getTrustScore,
  getTotalPointsPenalty,
  isProctoringActive,
  getAlerts,
  getPenaltySummary,
  getSessionSummary,
  requestFullscreen,
  exitFullscreen,
};
