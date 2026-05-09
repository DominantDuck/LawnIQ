const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const ImageCaptureService = require('./services/image-capture');
const ColorAnalysisService = require('./services/color-analysis-service');
const PolygonUtils = require('./services/polygon-utils');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const imageCaptureService = new ImageCaptureService();
const colorAnalysisService = new ColorAnalysisService();
const polygonUtils = new PolygonUtils();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function latLngToWorld(lat, lng) {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const x = (lng + 180) / 360;
  const y = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI);
  return { x, y };
}

function latLngToPixel({ lat, lng }, center, zoom, width, height) {
  const scale = 256 * Math.pow(2, zoom);
  const point = latLngToWorld(lat, lng);
  const centerPoint = latLngToWorld(center.lat, center.lng);
  return {
    x: (point.x - centerPoint.x) * scale + width / 2,
    y: (point.y - centerPoint.y) * scale + height / 2
  };
}

function haversineMeters(a, b) {
  const R = 6371000; // meters
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function metersPerPixelAtLatZoom(lat, zoom) {
  // WebMercator: initial resolution in meters/pixel at zoom 0.
  const latRad = (lat * Math.PI) / 180;
  const initialResolution = 156543.03392;
  return (initialResolution * Math.cos(latRad)) / Math.pow(2, zoom);
}

function focusPolygonsToCenterYard(polygons, center, zoom, imageWidth, focusRadiusMultiplier = 0.9) {
  if (!Array.isArray(polygons) || polygons.length === 0) return polygons;
  if (!Number.isFinite(zoom) || !Number.isFinite(imageWidth) || imageWidth <= 0) return polygons;

  const mpp = metersPerPixelAtLatZoom(center.lat, zoom);
  const halfMeters = mpp * (imageWidth / 2);
  const yardRadiusMeters = halfMeters * focusRadiusMultiplier;

  const minDistances = polygons.map((p) => {
    const coords = p.coordinates || [];
    let minD = Infinity;
    for (const coord of coords) {
      const d = haversineMeters(center, coord);
      if (d < minD) minD = d;
    }
    return minD;
  });

  const closest = Math.min(...minDistances);
  const thresholdMeters = Math.min(yardRadiusMeters, closest + 25); // 25m slack around closest polygon

  const filtered = polygons.filter((_, idx) => minDistances[idx] <= thresholdMeters);
  return filtered.length > 0 ? filtered : polygons;
}

function chooseMainHousePolygon(housePolygons, center) {
  if (!Array.isArray(housePolygons) || housePolygons.length === 0) return null;
  const centerPoint = center || null;
  if (!centerPoint) return housePolygons[0];

  let best = housePolygons[0];
  let bestDistance = Infinity;

  for (const hp of housePolygons) {
    const coords = hp.coordinates || [];
    let minD = Infinity;
    for (const c of coords) {
      const d = haversineMeters(centerPoint, c);
      if (d < minD) minD = d;
    }

    // Pick the closest house to the requested center coordinate.
    if (minD < bestDistance) {
      bestDistance = minD;
      best = hp;
    } else if (Math.abs(minD - bestDistance) < 1 && (hp.estimatedArea || 0) > (best.estimatedArea || 0)) {
      // Tie-breaker: pick larger footprint if nearly-equidistant.
      best = hp;
      bestDistance = minD;
    }
  }

  return best;
}

function filterLawnPolygonsNearHouse(lawnPolygons, housePolygon, centerSlackMeters = 40) {
  if (!Array.isArray(lawnPolygons) || lawnPolygons.length === 0) return lawnPolygons;
  if (!housePolygon) return lawnPolygons;

  const houseCoords = housePolygon.coordinates || [];
  if (houseCoords.length === 0) return lawnPolygons;

  const minDistances = lawnPolygons.map((lp) => {
    const lawnCoords = lp.coordinates || [];
    let minD = Infinity;
    for (const c of lawnCoords) {
      for (const hc of houseCoords) {
        const d = haversineMeters(c, hc);
        if (d < minD) minD = d;
      }
    }
    return minD;
  });

  const closest = Math.min(...minDistances);
  const threshold = closest + centerSlackMeters;
  const filtered = lawnPolygons.filter((_, idx) => minDistances[idx] <= threshold);
  return filtered.length > 0 ? filtered : lawnPolygons;
}

/**
 * Convert normalized pixel coordinates (0-1) back to geographic coordinates
 */
function pixelToLatLng(normalizedX, normalizedY, center, zoom, width, height) {
  // Convert normalized coordinates to actual pixel coordinates
  const pixelX = normalizedX * width;
  const pixelY = normalizedY * height;

  // Convert pixels back to world coordinates
  const scale = 256 * Math.pow(2, zoom);
  const centerPoint = latLngToWorld(center.lat, center.lng);

  const worldX = centerPoint.x + (pixelX - width / 2) / scale;
  const worldY = centerPoint.y + (pixelY - height / 2) / scale;

  // Convert world coordinates back to lat/lng
  const lng = worldX * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * worldY)));
  const lat = latRad * 180 / Math.PI;

  return { lat, lng };
}

/**
 * Convert color analysis polygons to geographic coordinates
 */
function convertColorPolygonsToGeoCoordinates(colorPolygons, mapContext) {
  const { centerLat, centerLng, zoom, width, height } = mapContext;
  const center = { lat: centerLat, lng: centerLng };

  return colorPolygons.map((polygon, index) => {
    const coordinates = polygon.points.map(point =>
      pixelToLatLng(point.x, point.y, center, zoom, width, height)
    );

    // Calculate area in square feet using the shoelace formula
    const areaSquareMeters = polygonUtils.calculatePolygonArea(coordinates);
    const areaSquareFeet = areaSquareMeters * 10.764; // Convert to sq ft

    return {
      id: `color_${index}`,
      coordinates,
      estimatedArea: areaSquareFeet,
      confidence: Math.min(0.9, 0.5 + polygon.area * 10), // Higher confidence for larger areas
      pixelCount: polygon.pixelCount,
      relativeArea: polygon.area,
      detectionMethod: 'color-analysis'
    };
  });
}

function createOverlaySvg(polygons, mapContext, overlayOptions = {}) {
  const { centerLat, centerLng, zoom, width, height } = mapContext;
  const {
    mode = 'fill', // 'fill' | 'outline'
    fillColor = '#FF0000',
    strokeColor = '#FF0000'
  } = overlayOptions;

  const isOutline = mode === 'outline';
  const paths = polygons
    .map((polygon) => {
      const pts = (polygon.coordinates || [])
        .map((coord) =>
          latLngToPixel(
            { lat: coord.lat, lng: coord.lng },
            { lat: centerLat, lng: centerLng },
            zoom,
            width,
            height
          )
        )
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
        // Don't clamp: let the SVG viewport clip any out-of-bounds vertices.
        .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
        .join(' ');

      if (!pts) return '';
      if (isOutline) {
        return `<polygon points="${pts}" fill="none" stroke="${strokeColor}" stroke-width="3" stroke-opacity="0.95" />`;
      }

      return `<polygon points="${pts}" fill="${fillColor}" fill-opacity="0.45" stroke="${strokeColor}" stroke-width="1" stroke-opacity="0.65" />`;
    })
    .filter(Boolean)
    .join('');

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paths}</svg>`
  );
}

async function buildLawnOverlayImageBase64(sourceImageBuffer, polygons, mapContext, overlayOptions = {}) {
  if (!sourceImageBuffer || !polygons?.length) return null;

  const svgOverlay = createOverlaySvg(polygons, mapContext, overlayOptions);
  const composed = await require('sharp')(sourceImageBuffer)
    .composite([{ input: svgOverlay, blend: 'over' }])
    .png({ quality: 92, compressionLevel: 6 })
    .toBuffer();

  return imageCaptureService.bufferToBase64(composed, 'png');
}

// Middleware — reflect localhost/127.0.0.1 with any port so Vite can use 5173, 5175, etc.
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = (process.env.FRONTEND_URL || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const isLocal =
      /^https?:\/\/localhost(:\d+)?$/i.test(origin) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin);
    if (isLocal) return cb(null, origin);
    if (allowed.includes(origin)) return cb(null, origin);
    if (process.env.NODE_ENV !== 'production') return cb(null, origin);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const router = express.Router();

// Health check endpoint
router.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'SwiftQuote. API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Debug endpoint
router.get('/api/debug-env', (req, res) => {
  res.json({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ? 'Set (' + process.env.GOOGLE_MAPS_API_KEY.length + ' chars)' : 'Not set',
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT
  });
});

// API Routes will be added here
router.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Debug image capture endpoint
router.get('/api/test-image', async (req, res) => {
  try {
    console.log('Testing image capture from server...');
    const result = await imageCaptureService.captureImage({
      lat: 37.7749,
      lng: -122.4194,
      zoom: 20,
      size: '640x640'
    });
    res.json({
      success: true,
      imageSize: result.image.data.length,
      message: 'Image capture successful'
    });
  } catch (error) {
    console.error('Test image capture failed:', error);
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
      details: error.response?.status || 'No response status'
    });
  }
});

// Color-based grass analysis endpoint
router.post('/api/analyze-color', async (req, res) => {
  try {
    const { lat, lng, propertyType, colorOptions } = req.body;

    // Validate required parameters
    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Latitude and longitude are required for color analysis'
      });
    }

    console.log(`🎨 Starting color-based lawn analysis for location: ${lat}, ${lng}`);

    // Step 1: Capture satellite image
    const imageResult = await imageCaptureService.captureImage({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      zoom: 20, // High detail for color analysis
      size: '1024x1024' // Larger size for better accuracy
    });

    const centerLat = parseFloat(lat);
    const centerLng = parseFloat(lng);
    const mapContext = {
      centerLat,
      centerLng,
      zoom: imageResult.metadata.zoom,
      width: imageResult.image.width,
      height: imageResult.image.height
    };

    // Step 2: Analyze colors in the image
    const colorAnalysis = await colorAnalysisService.analyzeGrassColors(
      imageResult.image.data,
      {
        minGrassPercentage: colorOptions?.minGrassPercentage || 5,
        smoothingRadius: colorOptions?.smoothingRadius || 2,
        minClusterSize: colorOptions?.minClusterSize || 100,
        ...colorOptions
      }
    );

    // Step 3: Extract dominant colors for additional context
    const dominantColors = await colorAnalysisService.extractDominantColors(
      imageResult.image.data,
      colorOptions?.numDominantColors || 5
    );

    // Step 4: Convert color-detected areas to geographic polygons
    const geoPolygons = convertColorPolygonsToGeoCoordinates(
      colorAnalysis.polygons,
      mapContext
    );

    // Calculate total area
    const totalArea = geoPolygons.reduce((sum, polygon) =>
      sum + (polygon.estimatedArea || 0), 0
    );

    // Step 5: Build overlay images showing detected grass areas
    const overlayImageBase64 = await buildLawnOverlayImageBase64(
      imageResult.image.data,
      geoPolygons,
      mapContext,
      { fillColor: '#00FF00', strokeColor: '#00AA00' } // Green for color-detected grass
    );

    const overlayOutlineImageBase64 = await buildLawnOverlayImageBase64(
      imageResult.image.data,
      geoPolygons,
      mapContext,
      { mode: 'outline', strokeColor: '#00FF00' }
    );

    // Create a visualization of the color mask
    let maskImageBase64 = null;
    if (colorAnalysis.mask) {
      try {
        // Convert binary mask to visual image
        const maskBuffer = Buffer.from(colorAnalysis.mask.map(pixel =>
          pixel ? [0, 255, 0, 255] : [0, 0, 0, 0] // Green for grass, transparent for non-grass
        ).flat());

        const maskImage = await require('sharp')(maskBuffer, {
          raw: {
            width: colorAnalysis.metadata.width,
            height: colorAnalysis.metadata.height,
            channels: 4
          }
        })
        .png()
        .toBuffer();

        maskImageBase64 = imageCaptureService.bufferToBase64(maskImage, 'png');
      } catch (maskError) {
        console.warn('Failed to create mask visualization:', maskError.message);
      }
    }

    // Step 6: Return comprehensive color analysis results
    const base64Image = imageCaptureService.bufferToBase64(imageResult.image.data, imageResult.image.format);

    res.json({
      success: true,
      analysis: {
        summary: `Color analysis completed: ${colorAnalysis.grassPercentage.toFixed(1)}% grass coverage detected`,
        method: 'color-based-detection',
        areasDetected: geoPolygons.length,
        totalArea: Math.round(totalArea),
        grassPercentage: colorAnalysis.grassPercentage,
        clustersFound: colorAnalysis.clustersFound,
        totalGrassPixels: colorAnalysis.totalGrassPixels,
        totalPixels: colorAnalysis.totalPixels
      },
      polygons: geoPolygons,
      dominantColors,
      overlayImageBase64,
      overlayOutlineImageBase64,
      maskImageBase64,
      image: {
        base64: base64Image,
        metadata: imageResult.metadata
      },
      colorResults: {
        method: 'HSV-color-space-analysis',
        grassColorRanges: colorAnalysisService.grassColorRanges,
        analysisParams: {
          minGrassPercentage: colorOptions?.minGrassPercentage || 5,
          smoothingRadius: colorOptions?.smoothingRadius || 2,
          minClusterSize: colorOptions?.minClusterSize || 100
        },
        analyzedAt: new Date().toISOString()
      },
      message: `Color analysis complete: ${geoPolygons.length} grass areas detected (${Math.round(totalArea)} sq ft total, ${colorAnalysis.grassPercentage.toFixed(1)}% coverage)`
    });

  } catch (error) {
    console.error('Color analysis failed:', error.message);
    res.status(500).json({
      error: 'Color analysis failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Direct color analysis endpoint (for when user already has an image)
router.post('/api/analyze-image-color', async (req, res) => {
  try {
    const { imageBase64, mapContext, colorOptions } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'imageBase64 is required'
      });
    }

    console.log('🎨 Analyzing provided image with color-based grass detection');

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(
      imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
      'base64'
    );

    // Analyze colors in the image
    const colorAnalysis = await colorAnalysisService.analyzeGrassColors(
      imageBuffer,
      {
        minGrassPercentage: colorOptions?.minGrassPercentage || 5,
        smoothingRadius: colorOptions?.smoothingRadius || 2,
        minClusterSize: colorOptions?.minClusterSize || 100,
        ...colorOptions
      }
    );

    // Extract dominant colors
    const dominantColors = await colorAnalysisService.extractDominantColors(
      imageBuffer,
      colorOptions?.numDominantColors || 5
    );

    let geoPolygons = [];
    let overlayImageBase64 = null;
    let overlayOutlineImageBase64 = null;

    // Convert to geographic coordinates if map context is provided
    if (mapContext &&
        Number.isFinite(mapContext.centerLat) &&
        Number.isFinite(mapContext.centerLng) &&
        Number.isFinite(mapContext.zoom)) {

      geoPolygons = convertColorPolygonsToGeoCoordinates(
        colorAnalysis.polygons,
        mapContext
      );

      // Build overlay images
      overlayImageBase64 = await buildLawnOverlayImageBase64(
        imageBuffer,
        geoPolygons,
        mapContext,
        { fillColor: '#00FF00', strokeColor: '#00AA00' }
      );

      overlayOutlineImageBase64 = await buildLawnOverlayImageBase64(
        imageBuffer,
        geoPolygons,
        mapContext,
        { mode: 'outline', strokeColor: '#00FF00' }
      );
    }

    const totalArea = geoPolygons.reduce((sum, polygon) =>
      sum + (polygon.estimatedArea || 0), 0
    );

    res.json({
      success: true,
      analysis: {
        summary: `Color analysis completed: ${colorAnalysis.grassPercentage.toFixed(1)}% grass coverage detected`,
        method: 'color-based-detection',
        areasDetected: geoPolygons.length,
        totalArea: Math.round(totalArea),
        grassPercentage: colorAnalysis.grassPercentage,
        clustersFound: colorAnalysis.clustersFound
      },
      polygons: geoPolygons,
      dominantColors,
      overlayImageBase64,
      overlayOutlineImageBase64,
      colorResults: {
        method: 'HSV-color-space-analysis',
        grassColorRanges: colorAnalysisService.grassColorRanges,
        analyzedAt: new Date().toISOString()
      },
      message: `Image color analysis complete: ${colorAnalysis.clustersFound} grass clusters detected`
    });

  } catch (error) {
    console.error('Image color analysis failed:', error.message);
    res.status(500).json({
      error: 'Image color analysis failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Polygon utility endpoints
router.post('/api/calculate-area', (req, res) => {
  try {
    const { coordinates } = req.body;

    if (!coordinates || !Array.isArray(coordinates)) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'coordinates array is required'
      });
    }

    const area = polygonUtils.calculatePolygonArea(coordinates);
    const bounds = polygonUtils.getPolygonBounds(coordinates);

    res.json({
      success: true,
      area: Math.round(area),
      areaFormatted: area.toLocaleString() + ' sq ft',
      bounds,
      coordinates: coordinates.length
    });
  } catch (error) {
    res.status(400).json({
      error: 'Area calculation failed',
      message: error.message
    });
  }
});

router.post('/api/process-polygon', (req, res) => {
  try {
    const { polygon, options = {} } = req.body;

    if (!polygon || !polygon.polygon) {
      return res.status(400).json({
        error: 'Missing polygon data',
        message: 'polygon object with coordinates is required'
      });
    }

    const processed = polygonUtils.convertDetectedPolygonsToGoogleMapsFormat([polygon], options);

    res.json({
      success: true,
      processedPolygon: processed[0],
      originalPoints: polygon.polygon.length,
      processedPoints: processed[0].coordinates.length
    });
  } catch (error) {
    res.status(400).json({
      error: 'Polygon processing failed',
      message: error.message
    });
  }
});

router.post('/api/polygons-to-geojson', (req, res) => {
  try {
    const { polygons } = req.body;

    if (!polygons || !Array.isArray(polygons)) {
      return res.status(400).json({
        error: 'Missing polygons data',
        message: 'polygons array is required'
      });
    }

    const geoJson = polygonUtils.toGeoJSON(polygons);

    res.json({
      success: true,
      geoJson,
      message: `Converted ${polygons.length} polygons to GeoJSON`
    });
  } catch (error) {
    res.status(400).json({
      error: 'GeoJSON conversion failed',
      message: error.message
    });
  }
});

// API service status endpoint
router.get('/api/status', (req, res) => {
  const imageCaptureStatus = {
    available: true,
    googleMapsConfigured: imageCaptureService.googleMapsApiKey &&
                          imageCaptureService.googleMapsApiKey !== 'placeholder_maps_api_key'
  };

  const polygonUtilsStatus = {
    available: true,
    capabilities: [
      'polygon processing',
      'coordinate validation',
      'area calculation',
      'polygon smoothing',
      'coordinate conversion',
      'GeoJSON export'
    ]
  };

  const colorAnalysisStatus = {
    available: true,
    capabilities: [
      'HSV color space analysis',
      'grass color detection',
      'dominant color extraction',
      'morphological smoothing',
      'connected component analysis',
      'pixel-to-geographic conversion'
    ],
    grassColorRanges: Object.keys(colorAnalysisService.grassColorRanges)
  };

  res.json({
    services: {
      imageCapture: imageCaptureStatus,
      colorAnalysis: colorAnalysisStatus,
      polygonUtils: polygonUtilsStatus
    },
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Frontend configuration endpoint
router.get('/api/config', (req, res) => {
  res.json({
    success: true,
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
      environment: process.env.NODE_ENV || 'development'
    },
    timestamp: new Date().toISOString()
  });
});

// Image capture endpoint
router.post('/api/capture-image', async (req, res) => {
  try {
    const { lat, lng, zoom, size, propertyType } = req.body;

    // Validate required parameters
    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Latitude and longitude are required'
      });
    }

    // Get optimal parameters if property type is specified
    const params = propertyType
      ? imageCaptureService.getOptimalParams(propertyType)
      : { zoom: zoom || 20, size: size || '640x640' };

    // Capture the image
    const result = await imageCaptureService.captureImage({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      zoom: params.zoom,
      size: params.size
    });

    // Convert to base64 for frontend consumption
    const base64Image = imageCaptureService.bufferToBase64(result.image.data, result.image.format);

    res.json({
      success: true,
      image: base64Image,
      metadata: result.metadata,
      message: 'Satellite image captured successfully'
    });

  } catch (error) {
    console.error('Image capture error:', error.message);
    res.status(500).json({
      error: 'Image capture failed',
      message: error.message
    });
  }
});

// Multi-zoom image capture endpoint
router.post('/api/capture-multi-zoom', async (req, res) => {
  try {
    const { lat, lng, propertyType } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Latitude and longitude are required'
      });
    }

    const params = imageCaptureService.getOptimalParams(propertyType || 'residential');

    const result = await imageCaptureService.captureMultiZoom({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      zooms: params.multiZoom,
      size: params.size
    });

    // Convert all images to base64
    const processedImages = result.images.map(img => ({
      ...img,
      image: {
        ...img.image,
        base64: imageCaptureService.bufferToBase64(img.image.data, img.image.format)
      }
    }));

    res.json({
      success: true,
      images: processedImages,
      location: result.location,
      capturedAt: result.capturedAt,
      message: `Captured ${processedImages.length} images at different zoom levels`
    });

  } catch (error) {
    console.error('Multi-zoom capture error:', error.message);
    res.status(500).json({
      error: 'Multi-zoom capture failed',
      message: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
router.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Vercel multi-service: requests arrive as /{routePrefix}/api/... — mount router under the same prefix.
const servicePrefix = (process.env.EXPRESS_ROUTE_PREFIX || '').trim().replace(/\/$/, '');
if (servicePrefix) {
  app.use(servicePrefix, router);
} else {
  app.use(router);
}

// Start server
app.listen(PORT, () => {
  const base = servicePrefix || '';
  console.log(`🌿 SwiftQuote. API server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(
    `🔗 Health check: http://localhost:${PORT}${base}/api/health`
  );
});

module.exports = app;