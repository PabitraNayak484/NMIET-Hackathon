// SATHI — Root App component (Phase 5 enhanced)
// Zustand-driven screen router (no external router needed for mobile-first PWA)
// Phase 5 additions:
//   · DebugPanel mounted when ?debug=1 or VITE_DEBUG_PANEL=true
//   · UpdateReadyBanner with safe-session-only display (MR-42)
//   · StorageWarningBanner wired from storageStore.isWarning
import React, { useEffect, useState, useCallback } from 'react';
import { useAgentStore }   from './stores/agentStore';
import { useNetworkStore } from './stores/networkStore';
import { useStorageStore } from './stores/storageStore';
import { ErrorBoundary }   from './ui/components/ErrorBoundary';

// Screens
import { ProfilePickerPage }    from './ui/screens/ProfilePickerPage';
import { ProfileSetupPage }     from './ui/screens/ProfileSetupPage';
import { StudyTimePage }        from './ui/screens/StudyTimePage';
import { HomePage }             from './ui/screens/HomePage';
import { AskPage }              from './ui/screens/AskPage';
import { ExplanationPage }      from './ui/screens/ExplanationPage';
import { QuizPage }             from './ui/screens/QuizPage';
import { FeedbackPage }         from './ui/screens/FeedbackPage';
import { GapVisualizationPage } from './ui/screens/GapVisualizationPage';
import { TracePage }            from './ui/screens/TracePage';
import { SettingsPage }         from './ui/screens/SettingsPage';

// Phase 5 components
import { DebugPanel }           from './ui/components/DebugPanel';
import { UpdateReadyBanner }    from './ui/components/UpdateReadyBanner';
import { StorageWarningBanner } from './ui/components/StorageWarningBanner';

// ---- Helpers ------------------------------------------------

/** Screens where an update banner must NOT appear (mid-quiz protection) */
const QUIZ_SCREENS = new Set<string>(['quiz']);

function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('debug') === '1') return true;
  if (import.meta.env.VITE_DEBUG_PANEL === 'true') return true;
  return false;
}

// ---- Screen Router ------------------------------------------

function ScreenRouter() {
  const screen = useAgentStore((s) => s.screen);

  switch (screen) {
    case 'profile-picker':  return <ProfilePickerPage />;
    case 'profile-setup':   return <ProfileSetupPage />;
    case 'study-time':      return <StudyTimePage />;
    case 'home':            return <HomePage />;
    case 'ask':             return <AskPage />;
    case 'explanation':     return <ExplanationPage />;
    case 'quiz':            return <QuizPage />;
    case 'feedback':        return <FeedbackPage />;
    case 'gaps':            return <GapVisualizationPage />;
    case 'trace':           return <TracePage />;
    case 'settings':        return <SettingsPage />;
    default:                return <ProfilePickerPage />;
  }
}

// ---- Network + Storage Monitor ------------------------------

function NetworkMonitor() {
  const { setStatus }                               = useNetworkStore();
  const { setIsPersisted, setEstimate, setWarning } = useStorageStore();

  useEffect(() => {
    setStatus(navigator.onLine ? 'ONLINE' : 'OFFLINE');

    const handleOnline  = () => setStatus('ONLINE');
    const handleOffline = () => setStatus('OFFLINE');
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    async function initStorage() {
      try {
        if (navigator.storage?.persist) {
          const persisted = await navigator.storage.persist();
          setIsPersisted(persisted);
        }
        if (navigator.storage?.estimate) {
          const est   = await navigator.storage.estimate();
          const usage = est.usage ?? 0;
          const quota = est.quota ?? 0;
          setEstimate(usage, quota);
          setWarning(quota > 0 && usage / quota > 0.8);
        }
      } catch (e) {
        console.warn('[SATHI] Storage API not available', e);
      }
    }
    initStorage();

    if (!localStorage.getItem('sathi_device_id')) {
      import('uuid').then(({ v4: uuidv4 }) => {
        localStorage.setItem('sathi_device_id', 'device_' + uuidv4());
      });
    }

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setStatus, setIsPersisted, setEstimate, setWarning]);

  return null;
}

// ---- Update-ready banner management (MR-42) -----------------
// Deferred from mid-quiz: banner accumulates until the student
// leaves the quiz screen.

function UpdateBannerManager() {
  const screen                              = useAgentStore((s) => s.screen);
  const [updatePending, setUpdatePending]   = useState(false);
  const [showBanner, setShowBanner]         = useState(false);

  // Listen for service worker update-ready (real SW or debug trigger)
  useEffect(() => {
    function handleUpdateReady() { setUpdatePending(true); }
    window.addEventListener('sathi:updateReady', handleUpdateReady);
    return () => window.removeEventListener('sathi:updateReady', handleUpdateReady);
  }, []);

  // Only surface banner when not on a mid-quiz screen (MR-42)
  useEffect(() => {
    if (updatePending && !QUIZ_SCREENS.has(screen)) {
      setShowBanner(true);
    }
  }, [updatePending, screen]);

  const handleUpdate  = useCallback(() => { setShowBanner(false); window.location.reload(); }, []);
  const handleDismiss = useCallback(() => { setShowBanner(false); }, []);

  if (!showBanner) return null;
  return <UpdateReadyBanner onUpdate={handleUpdate} onDismiss={handleDismiss} />;
}

// ---- Main App -----------------------------------------------

export function App() {
  const { isWarning } = useStorageStore();
  const debugMode     = isDebugMode();

  return (
    <ErrorBoundary>
      <NetworkMonitor />

      {/* Storage warning banner (MR-40) */}
      {isWarning && <StorageWarningBanner />}

      {/* Update ready banner (MR-42) — deferred from mid-quiz */}
      <UpdateBannerManager />

      {/* Main screen content */}
      <ScreenRouter />

      {/* Debug panel (Phase 5) — only in debug mode */}
      {debugMode && <DebugPanel />}
    </ErrorBoundary>
  );
}
