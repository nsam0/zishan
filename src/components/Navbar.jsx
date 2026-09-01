import React, { useState, useEffect } from 'react';
import { Download, LogOut, User, Menu, X, Shield, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  onOpenLoginModal,
  onToggleMobileMenu,
  isMobileMenuOpen
}) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install this PWA app:\n• Desktop: Click install icon (⊕) in address bar.\n• Android: Tap menu and choose "Add to Home screen" or "Install".\n• iOS: Tap Share button and choose "Add to Home Screen".');
    }
  };

  const displayName = profile?.full_name || user?.email || 'User';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Brand Logo & Role Badge */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-hidden cursor-pointer"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <img
                src="/logo.svg"
                alt="Global Skill Education Logo"
                className="w-9 h-9 object-contain drop-shadow-xs"
              />
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-base sm:text-lg tracking-tight">
                  Global Skill Education
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
                    isAdmin
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}
                >
                  {isAdmin ? 'Admin' : 'Attendance Staff'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Install & User Profile */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* PWA Install Button */}
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                title="Install app on your device"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Install App</span>
                <span className="sm:hidden">Install</span>
              </button>
            )}

            {/* Clickable User Profile Pill to Switch Role */}
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs sm:text-sm transition-colors cursor-pointer"
              title="Click to Switch Account"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}
              >
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-semibold text-slate-800 text-xs leading-none">
                  {displayName}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {isAdmin ? 'Full Admin Access' : 'Attendance Only'}
                </div>
              </div>
            </button>

            {/* Log Out */}
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to sign out?')) {
                  signOut();
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
