import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isDesktopMode } from '@/lib/platform';

/**
 * Desktop keyboard shortcuts for power users
 * Only active on desktop viewport or Tauri
 */
export function useDesktopShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDesktopMode()) return;

    const handler = (e: KeyboardEvent) => {
      // Don't trigger inside inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1': e.preventDefault(); navigate('/app'); break;
          case '2': e.preventDefault(); navigate('/app/produits'); break;
          case '3': e.preventDefault(); navigate('/app/depenses'); break;
          case '4': e.preventDefault(); navigate('/app/caisse'); break;
          case '5': e.preventDefault(); navigate('/app/messages'); break;
          case 'p': e.preventDefault(); navigate('/app/parametres'); break;
          case 'n': e.preventDefault(); navigate('/app/notifications'); break;
        }
      }

      if (e.key === 'F11') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
