import { StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { initMobileOfficerApp } from './mobileApp';
import './index.css';

function MobileStandaloneApp() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const cleanup = initMobileOfficerApp(rootRef.current);
    return () => {
      cleanup();
    };
  }, []);

  return <div id="mobile-standalone-root" ref={rootRef} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MobileStandaloneApp />
  </StrictMode>,
);
