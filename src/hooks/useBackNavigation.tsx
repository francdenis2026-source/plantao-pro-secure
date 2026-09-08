import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseBackNavigationOptions {
  enabled?: boolean;
  fallbackPath?: string;
}

export function useBackNavigation(options: UseBackNavigationOptions = {}) {
  const { enabled = true, fallbackPath = '/dashboard' } = options;
  const navigate = useNavigate();

  const goBack = useCallback(() => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  }, [navigate, fallbackPath]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if ESC is pressed and no modal/dialog is open
      if (event.key === 'Escape') {
        // Check if any dialog or modal is open
        const openDialogs = document.querySelectorAll('[role="dialog"]');
        const openPopovers = document.querySelectorAll('[data-state="open"]');
        
        // Don't navigate if a dialog or popover is open
        if (openDialogs.length > 0 || openPopovers.length > 0) {
          return;
        }

        // Check if we're focused on an input or textarea
        const activeElement = document.activeElement;
        if (
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement
        ) {
          // Blur the input instead of navigating
          activeElement.blur();
          return;
        }

        goBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, goBack]);

  return { goBack };
}
