import { useEffect, useRef, useState } from 'react';
import useAppStore from '../store/useAppStore';

function MapView() {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [geocoder, setGeocoder] = useState(null);
  const [drawingManager, setDrawingManager] = useState(null);

  const {
    setMap,
    setCurrentLocation,
    currentLocation,
    currentAddress,
    addPolygon,
    polygons,
    drawingMode,
    setDrawingMode,
    addNotification
  } = useAppStore();

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 33.749, lng: -84.388 }, // Default: Atlanta
      zoom: 19,
      mapTypeId: 'satellite',
      tilt: 0,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER
      }
    });

    const geocoderInstance = new window.google.maps.Geocoder();

    const drawingManagerInstance = new window.google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: {
        fillColor: '#5AA620',
        fillOpacity: 0.3,
        strokeColor: '#2D5A0A',
        strokeWeight: 2,
        clickable: true,
        editable: true,
        zIndex: 1
      }
    });

    drawingManagerInstance.setMap(map);

    // Handle polygon completion
    window.google.maps.event.addListener(drawingManagerInstance, 'polygoncomplete', (polygon) => {
      const path = polygon.getPath();
      const coordinates = [];

      for (let i = 0; i < path.getLength(); i++) {
        const point = path.getAt(i);
        coordinates.push({
          lat: point.lat(),
          lng: point.lng()
        });
      }

      // Calculate area
      const area = window.google.maps.geometry.spherical.computeArea(path) * 10.7639; // Convert to sq ft

      addPolygon({
        coordinates,
        area,
        source: 'manual',
        description: `Manual area ${polygons.length + 1}`,
        googleMapsPolygon: polygon
      });

      drawingManagerInstance.setDrawingMode(null);
      setDrawingMode(false);

      addNotification({
        type: 'success',
        title: 'Area Added',
        message: `Added ${Math.round(area).toLocaleString()} sq ft area`
      });

      // Add listeners for polygon editing
      ['set_at', 'insert_at', 'remove_at'].forEach(eventName => {
        window.google.maps.event.addListener(path, eventName, () => {
          const newArea = window.google.maps.geometry.spherical.computeArea(path) * 10.7639;
          // Update polygon area in store (would need to implement updatePolygon)
          console.log('Polygon edited, new area:', newArea);
        });
      });
    });

    setMapInstance(map);
    setGeocoder(geocoderInstance);
    setDrawingManager(drawingManagerInstance);
    setMap(map);

    addNotification({
      type: 'success',
      title: 'Map Loaded',
      message: 'Google Maps initialized successfully'
    });
  }, []);

  // Handle drawing mode changes
  useEffect(() => {
    if (!drawingManager) return;

    if (drawingMode) {
      drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
    } else {
      drawingManager.setDrawingMode(null);
    }
  }, [drawingMode, drawingManager]);

  // Auto-center map when location changes
  useEffect(() => {
    if (mapInstance && currentLocation) {
      mapInstance.setCenter({
        lat: currentLocation.lat,
        lng: currentLocation.lng
      });
      mapInstance.setZoom(20);
      console.log('📍 Map centered on:', currentLocation);
    }
  }, [currentLocation, mapInstance]);

  // Handle address search (this will be enhanced later)
  const searchAddress = async (address) => {
    if (!geocoder) return;

    try {
      const results = await new Promise((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK') {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });

      if (results[0]) {
        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();

        setCurrentLocation({ lat, lng }, results[0].formatted_address);
        mapInstance.setCenter({ lat, lng });
        mapInstance.setZoom(20);

        addNotification({
          type: 'success',
          title: 'Location Found',
          message: results[0].formatted_address
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      addNotification({
        type: 'error',
        title: 'Address Not Found',
        message: 'Could not find the specified address'
      });
    }
  };

  return (
    <div className="map-view">
      <div ref={mapRef} className="google-map"></div>

      {/* Map hint overlay */}
      <div className="map-hint">
        {!currentAddress && 'Search for a property address to get started'}
        {currentAddress && !drawingMode && polygons.length === 0 && 'Use Draw area to outline regions on the map'}
        {drawingMode && 'Click to place points — click the first point again to close the polygon'}
        {currentAddress && !drawingMode && polygons.length > 0 &&
          `${polygons.length} area${polygons.length === 1 ? '' : 's'} drawn — edit on the map`}
      </div>

      <style>{`
        .map-view {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .google-map {
          width: 100%;
          height: 100%;
        }

        .map-hint {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(23, 52, 4, 0.82);
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.75rem;
          padding: 0.375rem 1rem;
          border-radius: 20px;
          pointer-events: none;
          white-space: nowrap;
          backdrop-filter: blur(4px);
          transition: opacity 0.3s;
          z-index: 10;
          max-width: calc(100% - 2rem);
          text-align: center;
        }

        @media (max-width: 640px) {
          .map-hint {
            font-size: 0.6875rem;
            padding: 0.25rem 0.75rem;
            white-space: normal;
            max-width: calc(100% - 1rem);
            line-height: 1.3;
          }
        }
      `}</style>
    </div>
  );
}

export default MapView;