/**
 * CENTRE DE NOTIFICATIONS
 * 
 * Icône cloche avec badge de compteur de notifications non lues.
 * Au clic, ouvre un panel avec l'historique des notifications.
 * Le dropdown utilise un React portal pour éviter les problèmes d'overflow.
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AppNotification } from '../types';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearNotifications,
  onNotificationsUpdated,
  onNotificationAdded,
} from '../services/notificationService';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sync avec le service
  const syncState = () => {
    setNotifications(getNotifications());
    setUnreadCount(getUnreadCount());
  };

  useEffect(() => {
    syncState();

    const unsubUpdate = onNotificationsUpdated(syncState);
    const unsubAdd = onNotificationAdded(() => syncState());

    return () => {
      unsubUpdate();
      unsubAdd();
    };
  }, []);

  // Calculer la position du panel quand on ouvre
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  // Fermer le panel quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
    syncState();
  };

  const handleClear = () => {
    clearNotifications();
    syncState();
    setIsOpen(false);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      markAsRead(notif.id);
      syncState();
    }
    if (notif.action) {
      notif.action.onClick();
      setIsOpen(false);
    }
  };

  const getTypeStyles = (type: AppNotification['type']) => {
    switch (type) {
      case 'success': return { dot: 'bg-green-500', bg: 'bg-green-50', icon: '✓' };
      case 'error':   return { dot: 'bg-red-500',   bg: 'bg-red-50',   icon: '✕' };
      case 'warning': return { dot: 'bg-orange-500', bg: 'bg-orange-50', icon: '⚠' };
      default:        return { dot: 'bg-blue-500',  bg: 'bg-blue-50',  icon: 'ℹ' };
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    return `Il y a ${Math.floor(diffH / 24)}j`;
  };

  // Le panel est rendu via un portal pour échapper aux overflow:hidden parents
  const dropdownPanel = isOpen ? createPortal(
    <div
      ref={panelRef}
      className="fixed w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
      style={{
        top: `${panelPosition.top}px`,
        right: `${panelPosition.right}px`,
        zIndex: 9998,
        animation: 'fadeInDown 0.2s ease-out',
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="text-white font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-gray-300 hover:text-white text-xs transition-colors"
              title="Tout marquer comme lu"
            >
              Tout lire
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-white transition-colors"
              title="Tout effacer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Liste des notifications */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <p className="text-gray-400 text-sm">Aucune notification</p>
            <p className="text-gray-300 text-xs mt-1">Vous serez notifié ici</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const styles = getTypeStyles(notif.type);
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`
                  flex items-start gap-3 px-4 py-3 border-b border-gray-100 
                  cursor-pointer transition-colors hover:bg-gray-50
                  ${!notif.read ? 'bg-blue-50/50' : ''}
                `}
              >
                {/* Indicateur de type */}
                <div className={`w-8 h-8 ${styles.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <span className="text-sm">{styles.icon}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className={`w-2 h-2 ${styles.dot} rounded-full flex-shrink-0`} />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {formatTimeAgo(notif.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Animation */}
      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative">
      {/* Bouton cloche */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative w-9 h-9 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel rendu via portal */}
      {dropdownPanel}
    </div>
  );
}

export default NotificationCenter;
