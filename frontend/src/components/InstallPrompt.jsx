import { useState, useEffect } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Show prompt if iOS and not installed and not dismissed recently
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    if (iOS && !standalone && daysSinceDismissed > 7) {
      setTimeout(() => setShowPrompt(true), 3000); // Show after 3 seconds
    }
  }, []);

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50 safe-area-bottom">
      <button onClick={dismiss} className="absolute top-2 right-2 p-2 text-gray-400">
        <X size={20} />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xl">🎁</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Install Mathaka CRM</h3>
          <p className="text-sm text-gray-600 mt-1">
            {isIOS ? (
              <>
                Tap <Share size={16} className="inline mx-1" /> then <strong>"Add to Home Screen"</strong> <PlusSquare size={16} className="inline mx-1" />
              </>
            ) : (
              'Add this app to your home screen for quick access'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
