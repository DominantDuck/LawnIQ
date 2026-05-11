import { useEffect, useRef, useState } from 'react';
import { User } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import useCRMStore from '../store/useCRMStore';
import MeasurementAssociationModal from './MeasurementAssociationModal';

function MapView({ onOpenCRM }) {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [geocoder, setGeocoder] = useState(null);
  const [drawingManager, setDrawingManager] = useState(null);
  const [showAssociationModal, setShowAssociationModal] = useState(false);
  const [completedMeasurement, setCompletedMeasurement] = useState(null);

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

  const { isAuthenticated } = useCRMStore();

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

      const polygonData = {
        coordinates,
        area,
        source: 'manual',
        description: `Manual area ${polygons.length + 1}`,
        googleMapsPolygon: polygon
      };

      addPolygon(polygonData);

      drawingManagerInstance.setDrawingMode(null);
      setDrawingMode(false);

      // Store measurement data but don't show modal automatically
      // Users might want to measure multiple areas on the same property

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

  // Restore map overlays for polygons loaded from CRM (no googleMapsPolygon yet)
  useEffect(() => {
    if (!mapInstance || !window.google?.maps?.geometry) return;

    let hydrated = false;
    polygons.forEach((p) => {
      if (p.googleMapsPolygon) return;
      if (!p.coordinates?.length || p.coordinates.length < 3) return;

      const poly = new window.google.maps.Polygon({
        paths: p.coordinates,
        map: mapInstance,
        fillColor: '#5AA620',
        fillOpacity: 0.3,
        strokeColor: '#2D5A0A',
        strokeWeight: 2,
        clickable: true,
        editable: true,
        zIndex: 1
      });

      const path = poly.getPath();
      const area = window.google.maps.geometry.spherical.computeArea(path) * 10.7639;

      useAppStore.getState().updatePolygon(p.id, {
        googleMapsPolygon: poly,
        area
      });
      hydrated = true;

      ['set_at', 'insert_at', 'remove_at'].forEach((eventName) => {
        window.google.maps.event.addListener(path, eventName, () => {
          const newArea =
            window.google.maps.geometry.spherical.computeArea(path) * 10.7639;
          useAppStore.getState().updatePolygon(p.id, { area: newArea });
          useAppStore.getState().calculateTotalArea();
        });
      });
    });

    if (hydrated) {
      useAppStore.getState().calculateTotalArea();
    }
  }, [mapInstance, polygons]);

  // Handle manual measurement association (when user clicks button)
  const handleAssociateMeasurements = () => {
    if (polygons.length === 0) {
      addNotification({
        type: 'warning',
        title: 'No Measurements',
        message: 'Draw at least one area before associating with a contact'
      });
      return;
    }

    // Calculate total area from all polygons
    const totalArea = polygons.reduce((sum, polygon) => sum + polygon.area, 0);

    // Create consolidated measurement data
    const measurementData = {
      coordinates: polygons.map(p => p.coordinates), // Array of coordinate arrays
      areas: polygons.map(p => ({ area: p.area, description: p.description })), // Individual areas
      totalArea: totalArea,
      polygonCount: polygons.length,
      source: 'manual',
      description: `${polygons.length} area${polygons.length === 1 ? '' : 's'} measured`,
      address: currentAddress,
      location: currentLocation,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };

    setCompletedMeasurement(measurementData);
    setShowAssociationModal(true);
  };

  const handleCloseAssociationModal = (detail) => {
    const hadMeasurement = !!completedMeasurement;
    const startedAssociate = detail?.reason === 'associate';
    setShowAssociationModal(false);
    setCompletedMeasurement(null);

    if (hadMeasurement && !startedAssociate) {
      addNotification({
        type: 'success',
        title: 'Area Added',
        message: 'Measurement saved on the map. Use Associate with Contact when you are ready to link it.'
      });
    }
  };

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

      {/* Associate with Contact Button */}
      {currentAddress && !drawingMode && polygons.length > 0 && (
        <button
          className="associate-button"
          onClick={handleAssociateMeasurements}
          title={`Associate ${polygons.length} measurement${polygons.length === 1 ? '' : 's'} with a contact`}
        >
          <User size={20} />
          <span>Associate with Contact</span>
          <div className="measurement-count">
            {polygons.length} area{polygons.length === 1 ? '' : 's'}
          </div>
        </button>
      )}

      {/* Measurement Association Modal */}
      <MeasurementAssociationModal
        isOpen={showAssociationModal}
        onClose={handleCloseAssociationModal}
        measurementData={completedMeasurement}
        onOpenCRM={onOpenCRM}
      />

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

        .associate-button {
          position: absolute;
          bottom: 24px;
          right: 24px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, var(--green-500), var(--green-700));
          color: white;
          border: none;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(74, 138, 24, 0.3);
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 200ms ease;
          z-index: 15;
          backdrop-filter: blur(8px);
          min-height: 48px;
        }

        .associate-button:hover {
          background: linear-gradient(135deg, var(--green-700), var(--green-700));
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(74, 138, 24, 0.4);
        }

        .associate-button:active {
          transform: translateY(0);
        }

        .measurement-count {
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .map-hint {
            font-size: 0.6875rem;
            padding: 0.25rem 0.75rem;
            white-space: normal;
            max-width: calc(100% - 1rem);
            line-height: 1.3;
          }

          .associate-button {
            bottom: 16px;
            right: 16px;
            padding: 0.875rem 1rem;
            gap: 0.5rem;
            font-size: 0.8125rem;
            min-height: 44px;
          }

          .associate-button span {
            display: none;
          }

          .measurement-count {
            font-size: 0.6875rem;
            padding: 0.125rem 0.375rem;
          }
        }
      `}</style>
    </div>
  );
}

export default MapView;