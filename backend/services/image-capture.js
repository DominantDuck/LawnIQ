const axios = require('axios');
const sharp = require('sharp');

/**
 * Google Maps Static API Image Capture Service
 * Captures high-quality satellite images for measurement workflows
 */
class ImageCaptureService {
  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    this.maxImageSize = parseInt(process.env.MAX_IMAGE_SIZE_MB || 10) * 1024 * 1024; // Convert MB to bytes
  }

  /**
   * Capture satellite image for a given location
   * @param {Object} params - Capture parameters
   * @param {number} params.lat - Latitude
   * @param {number} params.lng - Longitude
   * @param {number} params.zoom - Zoom level (default: 20)
   * @param {number} params.size - Image size (default: 640x640)
   * @param {string} params.maptype - Map type (default: 'satellite')
   * @returns {Object} Image data and metadata
   */
  async captureImage({ lat, lng, zoom = 20, size = '640x640', maptype = 'satellite' }) {
    try {
      // Validate inputs
      this.validateInputs({ lat, lng, zoom, size });

      // Build Static Maps API URL
      const url = this.buildStaticMapUrl({ lat, lng, zoom, size, maptype });

      console.log(`🖼️  Capturing satellite image for location: ${lat}, ${lng}`);
      console.log(`🔗 Generated URL: ${url}`);

      // Fetch the image
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'SwiftQuote/1.0.0 (Satellite Image Capture)'
        }
      });

      // Validate image size
      if (response.data.length > this.maxImageSize) {
        throw new Error(`Image size (${(response.data.length / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${process.env.MAX_IMAGE_SIZE_MB || 10}MB)`);
      }

      // Process the image with Sharp
      const processedImage = await this.processImage(response.data);

      return {
        success: true,
        image: processedImage,
        metadata: {
          location: { lat, lng },
          zoom,
          size,
          maptype,
          originalSize: response.data.length,
          processedSize: processedImage.data.length,
          capturedAt: new Date().toISOString(),
          source: 'Google Maps Static API'
        }
      };

    } catch (error) {
      // Bubble up clearer Google Static Maps errors (key restrictions, billing, API disabled, etc.)
      if (error.response) {
        const status = error.response.status;
        let upstreamMessage = '';

        try {
          const raw = Buffer.isBuffer(error.response.data)
            ? error.response.data.toString('utf8')
            : String(error.response.data || '');
          upstreamMessage = raw.replace(/\s+/g, ' ').trim().slice(0, 300);
        } catch {
          upstreamMessage = '';
        }

        const details = upstreamMessage
          ? ` (Google response: ${upstreamMessage})`
          : '';
        console.error(`Image capture failed: HTTP ${status}${details}`);
        throw new Error(`Failed to capture satellite image: Google Static Maps API returned ${status}${details}`);
      }

      console.error('Image capture failed:', error.message);
      throw new Error(`Failed to capture satellite image: ${error.message}`);
    }
  }

  /**
   * Capture multiple images at different zoom levels for enhanced analysis
   * @param {Object} params - Capture parameters
   * @returns {Array} Array of captured images with metadata
   */
  async captureMultiZoom({ lat, lng, zooms = [19, 20, 21], size = '640x640' }) {
    try {
      const captures = await Promise.all(
        zooms.map(zoom => this.captureImage({ lat, lng, zoom, size }))
      );

      return {
        success: true,
        images: captures,
        location: { lat, lng },
        capturedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Multi-zoom capture failed: ${error.message}`);
    }
  }

  /**
   * Build Google Maps Static API URL
   * @private
   */
  buildStaticMapUrl({ lat, lng, zoom, size, maptype }) {
    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: zoom.toString(),
      size: size,
      maptype: maptype,
      format: 'png',
      scale: '2', // High DPI for better quality
      style: [
        // Remove labels for cleaner imagery
        'feature:all|element:labels|visibility:off',
        // Enhance satellite imagery
        'feature:landscape|element:geometry|saturation:100'
      ].join('&style='),
      key: this.googleMapsApiKey
    });

    return `${this.baseUrl}?${params}`;
  }

  /**
   * Process image for downstream analysis
   * @private
   */
  async processImage(imageBuffer) {
    try {
      // Process with Sharp for optimization
      const processed = await sharp(imageBuffer)
        .resize(1024, 1024, {
          fit: 'fill', // Ensure exact dimensions
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .png({ quality: 90, progressive: true })
        .toBuffer();

      // Get image metadata
      const metadata = await sharp(processed).metadata();

      return {
        data: processed,
        format: 'png',
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        density: metadata.density
      };
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Convert image buffer to base64 for API transmission
   */
  bufferToBase64(buffer, format = 'png') {
    return `data:image/${format};base64,${buffer.toString('base64')}`;
  }

  /**
   * Validate input parameters
   * @private
   */
  validateInputs({ lat, lng, zoom, size }) {
    // Validate coordinates
    if (typeof lat !== 'number' || lat < -90 || lat > 90) {
      throw new Error('Invalid latitude: must be between -90 and 90');
    }
    if (typeof lng !== 'number' || lng < -180 || lng > 180) {
      throw new Error('Invalid longitude: must be between -180 and 180');
    }

    // Validate zoom level
    if (typeof zoom !== 'number' || zoom < 1 || zoom > 22) {
      throw new Error('Invalid zoom level: must be between 1 and 22');
    }

    // Validate image size
    const sizeParts = size.split('x');
    if (sizeParts.length !== 2) {
      throw new Error('Invalid size format: must be "widthxheight"');
    }

    const width = parseInt(sizeParts[0]);
    const height = parseInt(sizeParts[1]);
    if (width > 2048 || height > 2048 || width < 100 || height < 100) {
      throw new Error('Invalid image dimensions: must be between 100x100 and 2048x2048');
    }

    // Validate API key
    if (!this.googleMapsApiKey || !this.googleMapsApiKey.startsWith('AIza')) {
      throw new Error('Invalid or missing Google Maps API key');
    }
  }

  /**
   * Get optimal capture parameters for property analysis
   * @param {string} propertyType - Type of property (residential, commercial, etc.)
   * @returns {Object} Optimized capture parameters
   */
  getOptimalParams(propertyType = 'residential') {
    const paramSets = {
      residential: {
        zoom: 20,
        size: '640x640',
        multiZoom: [19, 20, 21]
      },
      commercial: {
        zoom: 19,
        size: '1024x1024',
        multiZoom: [18, 19, 20]
      },
      rural: {
        zoom: 18,
        size: '1024x1024',
        multiZoom: [17, 18, 19]
      }
    };

    return paramSets[propertyType] || paramSets.residential;
  }
}

module.exports = ImageCaptureService;