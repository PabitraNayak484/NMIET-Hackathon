// SATHI — Root App component
// Zustand-driven screen router (no external router needed for mobile-first PWA)
import React, { useEffect } from 'react';
import { useAgentStore } from './stores/agentStore';
import { useNetworkStore } from './stores/networkStore';
import { useStorageStore } from './stores/storageStore';
import { ErrorBoundary } from './ui/components/ErrorBoundary';

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

function NetworkMonitor() {
  const { setStatus } = useNetworkStore();
  const { setIsPersisted, setEstimate, setWarning } = useStorageStore();

  useEffect(() => {
    // Initial network state
    setStatus(navigator.onLine ? 'ONLINE' : 'OFFLINE');

    // Network events
    const handleOnline  = () => setStatus('ONLINE');
    const handleOffline = () => setStatus('OFFLINE');
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    // Storage persistence (MR-40)
    async function initStorage() {
      try {
        if (navigator.storage?.persist) {
          const persisted = await navigator.storage.persist();
          setIsPersisted(persisted);
        }
        if (navigator.storage?.estimate) {
          const est = await navigator.storage.estimate();
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

    // Device ID
    if (!localStorage.getItem('sathi_device_id')) {
      import('uuid').then(({ v4: uuidv4 }) => {
        localStorage.setItem('sathi_device_id', `device_${uuidv4()}`);
      });
    }

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setStatus, setIsPersisted, setEstimate, setWarning]);

  return null;
}

export function App() {
  return (
    <ErrorBoundary>
      <NetworkMonitor />
      <ScreenRouter />
    </ErrorBoundary>
  );
}
