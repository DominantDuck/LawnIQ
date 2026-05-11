import { create } from 'zustand';

function serializePolygonForExport(p) {
  return {
    id: p.id,
    coordinates: Array.isArray(p.coordinates)
      ? p.coordinates.map((c) => ({ lat: c.lat, lng: c.lng }))
      : [],
    area: p.area,
    description: p.description,
    source: p.source || 'manual',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  };
}

/**
 * SwiftQuote. — manual map measurement only
 */
const useAppStore = create((set, get) => ({
  map: null,
  mapLoaded: false,
  currentLocation: null,
  currentAddress: '',
  searchLoading: false,

  polygons: [],
  selectedPolygon: null,
  drawingMode: false,
  totalArea: 0,

  sidebarOpen: true,
  notifications: [],
  apiKeysConfigured: false,

  autoSave: true,
  units: 'sqft',

  setMap: (map) => set({ map, mapLoaded: true }),

  setCurrentLocation: (location, address = '') => set({
    currentLocation: location,
    currentAddress: address
  }),

  setSearchLoading: (loading) => set({ searchLoading: loading }),

  addPolygon: (polygon) => set((state) => {
    const newPolygons = [...state.polygons, {
      id: `polygon_${Date.now()}`,
      ...polygon,
      createdAt: new Date().toISOString(),
      source: 'manual'
    }];

    const newTotalArea = newPolygons.reduce((sum, p) => sum + (p.area || 0), 0);

    return {
      polygons: newPolygons,
      totalArea: newTotalArea
    };
  }),

  updatePolygon: (id, updates) => set((state) => ({
    polygons: state.polygons.map(polygon =>
      polygon.id === id
        ? { ...polygon, ...updates, updatedAt: new Date().toISOString() }
        : polygon
    )
  })),

  removePolygon: (id) => set((state) => {
    const newPolygons = state.polygons.filter(polygon => polygon.id !== id);
    const newTotalArea = newPolygons.reduce((sum, p) => sum + (p.area || 0), 0);

    return {
      polygons: newPolygons,
      totalArea: newTotalArea,
      selectedPolygon: state.selectedPolygon?.id === id ? null : state.selectedPolygon
    };
  }),

  clearAllPolygons: () => {
    const { polygons } = get();
    for (const p of polygons) {
      if (p.googleMapsPolygon && typeof p.googleMapsPolygon.setMap === 'function') {
        p.googleMapsPolygon.setMap(null);
      }
    }
    set({
      polygons: [],
      totalArea: 0,
      selectedPolygon: null,
      drawingMode: false
    });
  },

  /**
   * Center map + replace polygons (e.g. viewing a contact's saved measurements).
   * Polygons should omit googleMapsPolygon — MapView will attach map overlays.
   */
  setMapFromContactView: ({ address, location, polygons }) => {
    const safe = (polygons || []).filter(
      (p) => Array.isArray(p.coordinates) && p.coordinates.length >= 3
    );
    const totalArea = safe.reduce((s, p) => s + (Number(p.area) || 0), 0);
    set({
      currentLocation: location,
      currentAddress: address || '',
      polygons: safe,
      totalArea,
      selectedPolygon: null,
      drawingMode: false
    });
  },

  setSelectedPolygon: (polygon) => set({ selectedPolygon: polygon }),

  setDrawingMode: (mode) => set({ drawingMode: mode }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  addNotification: (notification) => set((state) => ({
    notifications: [
      {
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: 'info',
        ...notification
      },
      ...state.notifications.slice(0, 4)
    ]
  })),

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  setAPIKeysConfigured: (configured) => set({ apiKeysConfigured: configured }),

  setAutoSave: (autoSave) => set({ autoSave }),
  setUnits: (units) => set({ units }),

  calculateTotalArea: () => set((state) => ({
    totalArea: state.polygons.reduce((sum, polygon) => sum + (polygon.area || 0), 0)
  })),

  formatArea: (area) => {
    const state = get();
    switch (state.units) {
      case 'sqm':
        return `${(area * 0.092903).toFixed(1)} m²`;
      case 'acres':
        return `${(area / 43560).toFixed(3)} acres`;
      default:
        return `${Math.round(area).toLocaleString()} sq ft`;
    }
  },

  exportData: () => {
    const state = get();
    return {
      polygons: state.polygons.map(serializePolygonForExport),
      totalArea: state.totalArea,
      location: state.currentLocation,
      address: state.currentAddress,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  },

  importData: (data) => {
    if (data && data.polygons) {
      const onlyManual = (data.polygons || []).filter((p) => p.source === 'manual');
      set({
        polygons: onlyManual,
        totalArea: onlyManual.reduce((s, p) => s + (p.area || 0), 0),
        currentLocation: data.location || null,
        currentAddress: data.address || ''
      });
      return true;
    }
    return false;
  },

  resetApp: () => set({
    polygons: [],
    selectedPolygon: null,
    drawingMode: false,
    totalArea: 0,
    notifications: []
  })
}));

export default useAppStore;
