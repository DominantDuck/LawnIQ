'use client';

import { useEffect, useRef, useState } from 'react';
import useAppStore from './store/useAppStore';
import useCRMStore from './store/useCRMStore';
import MapView from './components/MapView';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import NotificationContainer from './components/NotificationContainer';
import LoginModal from './components/auth/LoginModal';
import CRMLayout from './components/crm/CRMLayout';
import { BACKEND_DEV_URL } from './config';
import { polygonsFromContactProjects } from './lib/projectPolygonData';

function App() {
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [mapsLoadError, setMapsLoadError] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [configError, setConfigError] = useState(null);
  const [showCRM, setShowCRM] = useState(false);
  /** 'full' = sidebar CRM; 'quickContactCreate' = new contact form only (from measurement) */
  const [crmEntryMode, setCrmEntryMode] = useState('full');
  const crmEntryModeRef = useRef('full');

  const {
    sidebarOpen,
    addNotification,
    setAPIKeysConfigured,
    clearAllPolygons,
    setMapFromContactView
  } = useAppStore();

  const { checkAuth, projects, clearPendingMeasurement } = useCRMStore();

  const handleOpenCRM = (opts) => {
    // Ignore React click events (Header uses onClick={handleOpenCRM} without wrapping).
    const isLikelyDomEvent =
      opts && typeof opts === 'object' && typeof opts.preventDefault === 'function';
    const openOpts = isLikelyDomEvent ? undefined : opts;
    const mode =
      openOpts?.intent === 'measurement-contact' ? 'quickContactCreate' : 'full';
    crmEntryModeRef.current = mode;
    setCrmEntryMode(mode);
    setShowCRM(true);
  };

  const handleCloseCRM = () => {
    if (crmEntryModeRef.current === 'quickContactCreate') {
      clearPendingMeasurement();
    }
    crmEntryModeRef.current = 'full';
    setCrmEntryMode('full');
    setShowCRM(false);
  };

  const handleViewContactProperty = async (contact) => {
    try {
      setShowCRM(false);

      if (!contact.address?.trim()) {
        addNotification({
          type: 'warning',
          title: 'No address',
          message: `${contact.first_name} ${contact.last_name} has no address on file.`
        });
        return;
      }

      clearAllPolygons();

      const contactProjects = projects.filter(
        (p) => Number(p.contact_id) === Number(contact.id)
      );
      const polygonEntries = polygonsFromContactProjects(contactProjects);

      let location = null;
      let formattedAddress = contact.address.trim();

      if (typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
        try {
          const geocoder = new window.google.maps.Geocoder();
          const result = await new Promise((resolve, reject) => {
            geocoder.geocode({ address: contact.address.trim() }, (results, status) => {
              if (status === 'OK' && results?.[0]) resolve(results[0]);
              else reject(new Error(status));
            });
          });
          const l = result.geometry.location;
          location = { lat: l.lat(), lng: l.lng() };
          formattedAddress = result.formatted_address || formattedAddress;
        } catch {
          location = null;
        }
      }

      if (!location) {
        for (const p of contactProjects) {
          const loc = p.location;
          if (loc && Number.isFinite(Number(loc.lat)) && Number.isFinite(Number(loc.lng))) {
            location = { lat: Number(loc.lat), lng: Number(loc.lng) };
            break;
          }
        }
      }

      if (!location) {
        addNotification({
          type: 'error',
          title: 'Could not place on map',
          message:
            'Geocoding failed and no saved map location was found for this contact’s measurements. Try again after the map loads.'
        });
        return;
      }

      setMapFromContactView({
        address: formattedAddress,
        location,
        polygons: polygonEntries
      });

      const name = `${contact.first_name} ${contact.last_name}`;
      if (polygonEntries.length > 0) {
        addNotification({
          type: 'success',
          title: 'Showing on map',
          message: `${name} — ${polygonEntries.length} area${polygonEntries.length === 1 ? '' : 's'} from saved measurements`
        });
      } else {
        addNotification({
          type: 'info',
          title: 'Showing on map',
          message: `${name} — centered on address. No saved measurement polygons yet.`
        });
      }
    } catch (error) {
      console.error('Error viewing contact property:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load contact on the map'
      });
    }
  };

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
            'GOOGLE_MAPS_API_KEY is missing or invalid. Set it in the root .env file (or Vercel env) — must start with AIza.'
          );
        }
      } catch (err) {
        console.error('Config load failed:', err);
        setConfigError(
          `Could not load /api/config. Set GOOGLE_MAPS_API_KEY in the root .env file. If using Express proxy (USE_EXPRESS_BACKEND=true), start the backend at ${BACKEND_DEV_URL}.`
        );
      } finally {
        setConfigLoaded(true);
      }
    };

    loadConfig();
  }, []);

  // Check authentication status on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
      <Header onOpenCRM={handleOpenCRM} />

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
                  Add a valid <code>GOOGLE_MAPS_API_KEY</code> to the{' '}
                  <code>root .env file</code>, then reload the page.
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
            <MapView onOpenCRM={handleOpenCRM} />
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

      <LoginModal />
      <NotificationContainer />
      <CRMLayout
        isOpen={showCRM}
        entryMode={crmEntryMode}
        onClose={handleCloseCRM}
        onViewContactProperty={handleViewContactProperty}
      />
    </div>
  );
}

export default App;
