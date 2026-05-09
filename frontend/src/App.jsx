'use client';

import { useEffect, useState } from 'react';
import useAppStore from './store/useAppStore';
import MapView from './components/MapView';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import NotificationContainer from './components/NotificationContainer';
import { BACKEND_DEV_URL } from './config';

function App() {
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [mapsLoadError, setMapsLoadError] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [configError, setConfigError] = useState(null);

  const {
    sidebarOpen,
    addNotification,
    setAPIKeysConfigured
  } = useAppStore();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        const key = data.config?.googleMapsApiKey;
        if (key && typeof key === 'string' && key.startsWith('AIza')) {
          setApiKey(key);
          setConfigError(null);
        } else {
          setConfigError(
            'GOOGLE_MAPS_API_KEY is missing or invalid. Set it in frontend/.env.local (or Vercel env) — must start with AIza.'
          );
        }
      } catch (err) {
        console.error('Config load failed:', err);
        setConfigError(
          `Could not load /api/config. For local Next-only mode: set GOOGLE_MAPS_API_KEY in frontend/.env.local. If using Express proxy (USE_EXPRESS_BACKEND=true), start the backend at ${BACKEND_DEV_URL}.`
        );
      } finally {
        setConfigLoaded(true);
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    if (!configLoaded || configError || !apiKey) {
      return;
    }

    const loadGoogleMaps = async () => {
      try {
        if (window.google && window.google.maps && window.google.maps.places) {
          console.log('✅ Google Maps API already loaded');
          setGoogleMapsLoaded(true);
          setAPIKeysConfigured(true);
          return;
        }

        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          console.log('⏳ Google Maps API script already exists, waiting for load...');
          const checkInterval = setInterval(() => {
            if (window.google && window.google.maps && window.google.maps.places) {
              console.log('✅ Google Maps API loaded from existing script');
              setGoogleMapsLoaded(true);
              setAPIKeysConfigured(true);
              clearInterval(checkInterval);
            }
          }, 100);

          setTimeout(() => {
            clearInterval(checkInterval);
            if (!window.google || !window.google.maps || !window.google.maps.places) {
              setMapsLoadError('Timeout loading Google Maps API');
            }
          }, 10000);
          return;
        }

        console.log('🔄 Loading Google Maps API...');

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry,places&v=weekly`;
        script.async = true;
        script.defer = true;
        script.id = 'google-maps-api';

        script.onload = () => {
          console.log('✅ Google Maps API loaded successfully');
          setGoogleMapsLoaded(true);
          setAPIKeysConfigured(true);
          setMapsLoadError(null);
        };

        script.onerror = () => {
          const error = 'Failed to load Google Maps API';
          console.error('❌', error);
          setMapsLoadError(error);
          addNotification({
            type: 'error',
            title: 'Maps Load Error',
            message: 'Failed to load Google Maps. Check GOOGLE_MAPS_API_KEY and API restrictions.'
          });
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('❌ Failed to load Google Maps API:', error);
        setMapsLoadError(error.message);
        addNotification({
          type: 'error',
          title: 'Maps Load Error',
          message: 'Failed to load Google Maps.'
        });
      }
    };

    loadGoogleMaps();
  }, [apiKey, configLoaded, configError, addNotification, setAPIKeysConfigured]);

  return (
    <div className="app">
      <Header />

      <div className="app-main">
        <Sidebar />

        <div className={`map-container ${!sidebarOpen ? 'expanded' : ''}`}>
          {configError ? (
            <div className="map-loading">
              <div className="error-state">
                <div className="error-icon">🗺️</div>
                <h3>Maps configuration</h3>
                <p>{configError}</p>
                <p className="config-hint">
                  Add a valid <code>GOOGLE_MAPS_API_KEY</code> to{' '}
                  <code>backend/.env</code>, ensure the backend is running, then reload.
                </p>
                <button
                  type="button"
                  className="retry-button"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </button>
              </div>
            </div>
          ) : googleMapsLoaded ? (
            <MapView />
          ) : (
            <div className="map-loading">
              {mapsLoadError ? (
                <div className="error-state">
                  <div className="error-icon">🗺️</div>
                  <h3>Map loading error</h3>
                  <p>{mapsLoadError}</p>
                  <button
                    type="button"
                    className="retry-button"
                    onClick={() => window.location.reload()}
                  >
                    Reload
                  </button>
                </div>
              ) : (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <h3>{!configLoaded ? 'Initializing…' : 'Loading Google Maps'}</h3>
                  <p>
                    {!configLoaded
                      ? 'Loading configuration from the API…'
                      : 'Initializing mapping services…'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <NotificationContainer />
    </div>
  );
}

export default App;
