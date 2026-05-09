/**
 * Polygon Utilities Service
 * Handles coordinate parsing, polygon generation, and geometric operations
 */
class PolygonUtils {
  constructor() {
    this.earthRadiusMeters = 6378137; // Earth's radius in meters
  }

  /**
   * Convert detected polygon data to Google Maps format
   * @param {Array} detectedPolygons - Polygons from vision/satellite detection
   * @param {Object} options - Conversion options
   * @returns {Array} Array of Google Maps compatible polygon objects
   */
  convertDetectedPolygonsToGoogleMapsFormat(detectedPolygons, options = {}) {
    try {
      return detectedPolygons.map((polygon, index) => {
        // Validate polygon structure
        this.validatePolygon(polygon);

        // Process coordinates
        const processedCoords = this.processPolygonCoordinates(
          polygon.polygon,
          options
        );

        return {
          id: polygon.id || `quote_area_${index + 1}`,
          description: polygon.description || `Measured area ${index + 1}`,
          coordinates: processedCoords,
          paths: [processedCoords], // Google Maps format
          estimatedArea: polygon.estimatedArea || this.calculatePolygonArea(processedCoords),
          confidence: polygon.confidence || 0.5,
          grassType: polygon.grassType || 'maintained lawn',
          metadata: {
            originalPoints: polygon.polygon.length,
            processedPoints: processedCoords.length,
            smoothed: options.smoothPolygon !== false,
            validated: true,
            createdAt: new Date().toISOString()
          }
        };
      });
    } catch (error) {
      console.error('Failed to convert detected polygons:', error.message);
      throw new Error(`Polygon conversion failed: ${error.message}`);
    }
  }

  /**
   * Process and optimize polygon coordinates
   * @private
   */
  processPolygonCoordinates(coordinates, options = {}) {
    let coords = [...coordinates];

    // 1. Validate coordinate format
    coords = this.validateAndNormalizeCoordinates(coords);

    // 2. Remove duplicate points
    coords = this.removeDuplicatePoints(coords);

    // 3. Ensure minimum points for a valid polygon
    if (coords.length < 3) {
      throw new Error('Polygon must have at least 3 points');
    }

    // 4. Close polygon if not already closed
    coords = this.ensureClosedPolygon(coords);

    // 5. Smooth polygon if requested (default: true)
    if (options.smoothPolygon !== false) {
      coords = this.smoothPolygon(coords, options.smoothingFactor || 0.1);
    }

    // 6. Simplify polygon to reduce point count while preserving shape
    if (options.simplify !== false) {
      coords = this.simplifyPolygon(coords, options.tolerance || 0.00001);
    }

    // 7. Validate final polygon
    this.validateFinalPolygon(coords);

    return coords;
  }

  /**
   * Validate and normalize coordinate format
   * @private
   */
  validateAndNormalizeCoordinates(coordinates) {
    return coordinates.map((coord, index) => {
      // Handle different input formats
      let lat, lng;

      if (typeof coord === 'object' && coord !== null) {
        if ('lat' in coord && 'lng' in coord) {
          lat = coord.lat;
          lng = coord.lng;
        } else if ('latitude' in coord && 'longitude' in coord) {
          lat = coord.latitude;
          lng = coord.longitude;
        } else if (Array.isArray(coord) && coord.length >= 2) {
          lat = coord[0];
          lng = coord[1];
        } else {
          throw new Error(`Invalid coordinate format at index ${index}`);
        }
      } else {
        throw new Error(`Invalid coordinate type at index ${index}`);
      }

      // Validate coordinate values
      lat = parseFloat(lat);
      lng = parseFloat(lng);

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error(`Invalid coordinate values at index ${index}: lat=${lat}, lng=${lng}`);
      }

      if (lat < -90 || lat > 90) {
        throw new Error(`Invalid latitude at index ${index}: ${lat} (must be between -90 and 90)`);
      }

      if (lng < -180 || lng > 180) {
        throw new Error(`Invalid longitude at index ${index}: ${lng} (must be between -180 and 180)`);
      }

      return { lat, lng };
    });
  }

  /**
   * Remove duplicate consecutive points
   * @private
   */
  removeDuplicatePoints(coordinates, tolerance = 0.000001) {
    if (coordinates.length <= 1) return coordinates;

    const unique = [coordinates[0]];

    for (let i = 1; i < coordinates.length; i++) {
      const current = coordinates[i];
      const previous = unique[unique.length - 1];

      const distance = this.getDistanceBetweenPoints(current, previous);
      if (distance > tolerance) {
        unique.push(current);
      }
    }

    return unique;
  }

  /**
   * Ensure polygon is closed (first point equals last point)
   * @private
   */
  ensureClosedPolygon(coordinates) {
    if (coordinates.length < 3) return coordinates;

    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];

    // Check if already closed
    if (Math.abs(first.lat - last.lat) < 0.000001 &&
        Math.abs(first.lng - last.lng) < 0.000001) {
      return coordinates;
    }

    // Add closing point
    return [...coordinates, { lat: first.lat, lng: first.lng }];
  }

  /**
   * Smooth polygon using simple averaging algorithm
   * @private
   */
  smoothPolygon(coordinates, factor = 0.1) {
    if (coordinates.length <= 3) return coordinates;

    const smoothed = [...coordinates];
    const iterations = Math.max(1, Math.floor(factor * 10));

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 1; i < smoothed.length - 1; i++) {
        const prev = smoothed[i - 1];
        const current = smoothed[i];
        const next = smoothed[i + 1];

        // Simple averaging smoothing
        smoothed[i] = {
          lat: current.lat + factor * ((prev.lat + next.lat) / 2 - current.lat),
          lng: current.lng + factor * ((prev.lng + next.lng) / 2 - current.lng)
        };
      }
    }

    return smoothed;
  }

  /**
   * Simplify polygon using Douglas-Peucker algorithm
   * @private
   */
  simplifyPolygon(coordinates, tolerance = 0.00001) {
    if (coordinates.length <= 3) return coordinates;

    return this.douglasPeucker(coordinates, tolerance);
  }

  /**
   * Douglas-Peucker line simplification algorithm
   * @private
   */
  douglasPeucker(points, tolerance) {
    if (points.length <= 2) return points;

    // Find the point with maximum distance from line between first and last
    let maxDistance = 0;
    let maxIndex = 0;

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.getPerpendicularDistance(
        points[i],
        points[0],
        points[points.length - 1]
      );

      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const right = this.douglasPeucker(points.slice(maxIndex), tolerance);

      // Combine results (remove duplicate middle point)
      return [...left.slice(0, -1), ...right];
    } else {
      // Return simplified line with just endpoints
      return [points[0], points[points.length - 1]];
    }
  }

  /**
   * Calculate polygon area using Shoelace formula
   * @param {Array} coordinates - Array of {lat, lng} coordinates
   * @returns {number} Area in square feet
   */
  calculatePolygonArea(coordinates) {
    if (coordinates.length < 3) return 0;

    // Convert to projected coordinates for more accurate area calculation
    const projectedCoords = coordinates.map(coord =>
      this.latLngToMeters(coord.lat, coord.lng)
    );

    // Shoelace formula
    let area = 0;
    for (let i = 0; i < projectedCoords.length - 1; i++) {
      area += projectedCoords[i].x * projectedCoords[i + 1].y;
      area -= projectedCoords[i + 1].x * projectedCoords[i].y;
    }

    area = Math.abs(area) / 2; // Area in square meters

    // Convert to square feet
    return area * 10.7639;
  }

  /**
   * Convert lat/lng to meters using Web Mercator projection
   * @private
   */
  latLngToMeters(lat, lng) {
    const x = lng * 20037508.34 / 180;
    let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
    y = y * 20037508.34 / 180;
    return { x, y };
  }

  /**
   * Get distance between two points in degrees
   * @private
   */
  getDistanceBetweenPoints(point1, point2) {
    const latDiff = point1.lat - point2.lat;
    const lngDiff = point1.lng - point2.lng;
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  /**
   * Get perpendicular distance from point to line
   * @private
   */
  getPerpendicularDistance(point, lineStart, lineEnd) {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
      return Math.sqrt(A * A + B * B);
    }

    const param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = lineStart.lat;
      yy = lineStart.lng;
    } else if (param > 1) {
      xx = lineEnd.lat;
      yy = lineEnd.lng;
    } else {
      xx = lineStart.lat + param * C;
      yy = lineStart.lng + param * D;
    }

    const dx = point.lat - xx;
    const dy = point.lng - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Validate polygon structure
   * @private
   */
  validatePolygon(polygon) {
    if (!polygon || typeof polygon !== 'object') {
      throw new Error('Invalid polygon: must be an object');
    }

    if (!polygon.polygon || !Array.isArray(polygon.polygon)) {
      throw new Error('Invalid polygon: missing or invalid polygon array');
    }

    if (polygon.polygon.length < 3) {
      throw new Error('Invalid polygon: must have at least 3 points');
    }
  }

  /**
   * Validate final processed polygon
   * @private
   */
  validateFinalPolygon(coordinates) {
    if (coordinates.length < 3) {
      throw new Error('Final polygon must have at least 3 points');
    }

    // Check for self-intersections (basic check)
    if (this.hasSelfIntersections(coordinates)) {
      console.warn('Warning: Polygon may have self-intersections');
    }

    // Calculate area to ensure it's reasonable
    const area = this.calculatePolygonArea(coordinates);
    if (area < 10) {
      console.warn(`Warning: Very small polygon area: ${area.toFixed(1)} sq ft`);
    }
    if (area > 100000) {
      console.warn(`Warning: Very large polygon area: ${area.toFixed(0)} sq ft`);
    }
  }

  /**
   * Basic self-intersection check
   * @private
   */
  hasSelfIntersections(coordinates) {
    // Simple check - this could be made more sophisticated
    if (coordinates.length < 4) return false;

    for (let i = 0; i < coordinates.length - 3; i++) {
      for (let j = i + 2; j < coordinates.length - 1; j++) {
        if (this.linesIntersect(
          coordinates[i], coordinates[i + 1],
          coordinates[j], coordinates[j + 1]
        )) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if two line segments intersect
   * @private
   */
  linesIntersect(p1, q1, p2, q2) {
    const orientation = (p, q, r) => {
      const val = (q.lng - p.lng) * (r.lat - q.lat) - (q.lat - p.lat) * (r.lng - q.lng);
      if (val === 0) return 0;
      return val > 0 ? 1 : 2;
    };

    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    return (o1 !== o2 && o3 !== o4);
  }

  /**
   * Get polygon bounds (bounding box)
   */
  getPolygonBounds(coordinates) {
    if (!coordinates || coordinates.length === 0) return null;

    let minLat = coordinates[0].lat;
    let maxLat = coordinates[0].lat;
    let minLng = coordinates[0].lng;
    let maxLng = coordinates[0].lng;

    coordinates.forEach(coord => {
      minLat = Math.min(minLat, coord.lat);
      maxLat = Math.max(maxLat, coord.lat);
      minLng = Math.min(minLng, coord.lng);
      maxLng = Math.max(maxLng, coord.lng);
    });

    return {
      north: maxLat,
      south: minLat,
      east: maxLng,
      west: minLng,
      center: {
        lat: (minLat + maxLat) / 2,
        lng: (minLng + maxLng) / 2
      }
    };
  }

  /**
   * Convert polygon to GeoJSON format
   */
  toGeoJSON(polygons) {
    return {
      type: 'FeatureCollection',
      features: polygons.map((polygon, index) => ({
        type: 'Feature',
        properties: {
          id: polygon.id || index,
          description: polygon.description,
          estimatedArea: polygon.estimatedArea,
          confidence: polygon.confidence,
          grassType: polygon.grassType
        },
        geometry: {
          type: 'Polygon',
          coordinates: [polygon.coordinates.map(coord => [coord.lng, coord.lat])]
        }
      }))
    };
  }
}

module.exports = PolygonUtils;