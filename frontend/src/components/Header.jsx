import { Search, Menu, MapPin } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import './Header.css';

function logAddressSearch(formattedAddress, lat, lng) {
  fetch('/api/log-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formattedAddress, lat, lng })
  }).catch(() => {});
}

function Header() {
  const [addressInput, setAddressInput] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const predictionsRef = useRef(null);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);

  const {
    currentAddress,
    searchLoading,
    totalArea,
    sidebarOpen,
    toggleSidebar,
    formatArea,
    setCurrentLocation,
    setSearchLoading,
    addNotification
  } = useAppStore();

  // Initialize Google Places services
  useEffect(() => {
    const initializePlacesServices = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log('🔍 Initializing Google Places services');
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        // Create a dummy map for PlacesService (required by the API)
        const dummyMap = new window.google.maps.Map(document.createElement('div'));
        placesService.current = new window.google.maps.places.PlacesService(dummyMap);
        return true;
      }
      return false;
    };

    // Try immediate initialization
    if (initializePlacesServices()) {
      return;
    }

    // If not ready, poll until Google Maps is fully loaded
    const checkInterval = setInterval(() => {
      if (initializePlacesServices()) {
        clearInterval(checkInterval);
      }
    }, 100);

    // Cleanup interval on unmount
    return () => clearInterval(checkInterval);
  }, []);

  // Debounced autocomplete search
  useEffect(() => {
    if (!autocompleteService.current || !addressInput.trim() || addressInput.length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      // Double-check that the service is still available
      if (!autocompleteService.current || !window.google?.maps?.places?.PlacesServiceStatus) {
        console.warn('⚠️ Google Places service not ready for autocomplete');
        return;
      }

      autocompleteService.current.getPlacePredictions(
        {
          input: addressInput,
          types: ['address'],
          componentRestrictions: { country: 'us' }, // Restrict to US addresses
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            console.log(`🔍 Found ${predictions.length} address predictions for: ${addressInput}`);
            setPredictions(predictions.slice(0, 5)); // Limit to 5 predictions
            setShowPredictions(true);
            setSelectedIndex(-1);
          } else {
            console.log(`🔍 No predictions found for: ${addressInput} (status: ${status})`);
            setPredictions([]);
            setShowPredictions(false);
          }
        }
      );
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [addressInput]);

  // Handle search submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (addressInput.trim()) {
      if (predictions.length > 0) {
        // Use first prediction if available
        handlePredictionSelect(predictions[0]);
      } else {
        // Fallback to geocoding search
        searchAddress(addressInput);
      }
    }
  };

  // Handle prediction selection
  const handlePredictionSelect = (prediction) => {
    if (!placesService.current) return;

    setSearchLoading(true);
    setAddressInput(prediction.description);
    setShowPredictions(false);

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['geometry', 'formatted_address', 'name']
      },
      (place, status) => {
        setSearchLoading(false);

        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          };

          const label = place.formatted_address || prediction.description;
          setCurrentLocation(location, label);
          logAddressSearch(label, location.lat, location.lng);
          addNotification({
            type: 'success',
            title: 'Location Found',
            message: label
          });
        } else {
          addNotification({
            type: 'error',
            title: 'Location Error',
            message: 'Could not get details for this location'
          });
        }
      }
    );
  };

  // Fallback geocoding search
  const searchAddress = (address) => {
    if (!window.google || !window.google.maps) return;

    setSearchLoading(true);
    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode({ address }, (results, status) => {
      setSearchLoading(false);

      if (status === 'OK' && results[0]) {
        const location = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng()
        };

        const label = results[0].formatted_address;
        setCurrentLocation(location, label);
        logAddressSearch(label, location.lat, location.lng);
        addNotification({
          type: 'success',
          title: 'Location Found',
          message: label
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Address Not Found',
          message: 'Could not find the specified address'
        });
      }
    });
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showPredictions || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handlePredictionSelect(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowPredictions(false);
        setSelectedIndex(-1);
        searchInputRef.current?.blur();
        break;
    }
  };

  // Close predictions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        predictionsRef.current &&
        !predictionsRef.current.contains(event.target) &&
        !searchInputRef.current?.contains(event.target)
      ) {
        setShowPredictions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        {/* Mobile menu toggle */}
        <button
          className="button mobile-menu"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu size={16} />
        </button>

        {/* Logo */}
        <div className="wordmark">
          <span className="brand">SwiftQuote.</span>
        </div>
      </div>

      {/* Search */}
      <div className="header-center">
        <div className="search-container">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              ref={searchInputRef}
              type="text"
              className="input search-input"
              placeholder="Enter property address..."
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => predictions.length > 0 && setShowPredictions(true)}
              disabled={searchLoading}
              autoComplete="off"
            />
            <button
              type="submit"
              className="button primary search-button"
              disabled={searchLoading || !addressInput.trim()}
            >
              <Search size={14} />
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Autocomplete Predictions Dropdown */}
          {showPredictions && predictions.length > 0 && (
            <div ref={predictionsRef} className="predictions-dropdown">
              {predictions.map((prediction, index) => (
                <div
                  key={prediction.place_id}
                  className={`prediction-item ${
                    index === selectedIndex ? 'selected' : ''
                  }`}
                  onClick={() => handlePredictionSelect(prediction)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="prediction-icon">
                    <MapPin size={16} />
                  </div>
                  <div className="prediction-content">
                    <div className="prediction-main">
                      {prediction.structured_formatting?.main_text || prediction.description.split(',')[0]}
                    </div>
                    <div className="prediction-secondary">
                      {prediction.structured_formatting?.secondary_text ||
                       prediction.description.split(',').slice(1).join(',').trim()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="header-right">
        {/* Area display */}
        <div className="area-display">
          <span className="number">
            {totalArea > 0 ? Math.round(totalArea).toLocaleString() : '—'}
          </span>
          <span className="unit">sq ft</span>
        </div>

      </div>
    </header>
  );
}

export default Header;