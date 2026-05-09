const sharp = require('sharp');

class ColorAnalysisService {
    constructor() {
        // Define grass color ranges in HSV color space
        // HSV is better for vegetation detection than RGB
        this.grassColorRanges = {
            // Healthy green grass
            healthyGrass: {
                hue: { min: 60, max: 120 },      // Green hues
                saturation: { min: 20, max: 100 }, // Not too desaturated
                value: { min: 20, max: 85 }       // Not too dark or bright
            },
            // Brown/dormant grass (expanded range)
            dormantGrass: {
                hue: { min: 15, max: 50 },       // Brown/yellow hues (expanded)
                saturation: { min: 10, max: 95 }, // Higher saturation allowed
                value: { min: 15, max: 75 }       // Slightly brighter allowed
            },
            // Yellow/dry grass
            dryGrass: {
                hue: { min: 45, max: 70 },       // Yellow-green hues (expanded)
                saturation: { min: 15, max: 95 }, // Higher saturation allowed
                value: { min: 20, max: 85 }       // Brighter allowed
            }
        };
    }

    /**
     * Analyze image colors and detect grass areas
     */
    async analyzeGrassColors(imageBuffer, options = {}) {
        try {
            const {
                minGrassPercentage = 5,  // Minimum % of image that should be grass
                smoothingRadius = 2,     // Morphological smoothing
                minClusterSize = 100     // Minimum pixels for a grass cluster
            } = options;

            // Get image metadata
            const metadata = await sharp(imageBuffer).metadata();
            const { width, height } = metadata;

            // Convert to RGB if needed and get pixel data
            const { data } = await sharp(imageBuffer)
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            // Convert RGB to HSV and create grass mask
            const grassMask = this.createGrassMask(data, width, height);

            // Calculate grass coverage percentage
            const totalPixels = width * height;
            const grassPixels = grassMask.reduce((sum, pixel) => sum + pixel, 0);
            const grassPercentage = (grassPixels / totalPixels) * 100;

            // Apply morphological operations to smooth the mask
            const smoothedMask = await this.smoothMask(grassMask, width, height, smoothingRadius);

            // Find connected components (grass clusters)
            const clusters = this.findGrassClusters(smoothedMask, width, height, minClusterSize);

            // Convert pixel clusters to geographic polygons
            const polygons = this.clustersToPolygons(clusters, width, height);

            return {
                grassPercentage,
                totalGrassPixels: grassPixels,
                totalPixels,
                clustersFound: clusters.length,
                polygons,
                mask: smoothedMask,
                metadata: { width, height }
            };

        } catch (error) {
            console.error('Error in color analysis:', error);
            throw new Error(`Color analysis failed: ${error.message}`);
        }
    }

    /**
     * Extract dominant colors from the image
     */
    async extractDominantColors(imageBuffer, numColors = 5) {
        try {
            // Resize image for faster processing
            const resizedBuffer = await sharp(imageBuffer)
                .resize(200, 200)
                .raw()
                .toBuffer();

            const metadata = await sharp(imageBuffer).resize(200, 200).metadata();
            const { width, height, channels } = metadata;

            // Convert to HSV and analyze color distribution
            const colors = [];
            const colorCounts = new Map();

            for (let i = 0; i < resizedBuffer.length; i += channels) {
                const r = resizedBuffer[i];
                const g = resizedBuffer[i + 1];
                const b = resizedBuffer[i + 2];

                const [h, s, v] = this.rgbToHsv(r, g, b);

                // Quantize colors to reduce noise
                const quantizedH = Math.round(h / 10) * 10;
                const quantizedS = Math.round(s / 10) * 10;
                const quantizedV = Math.round(v / 10) * 10;

                const colorKey = `${quantizedH},${quantizedS},${quantizedV}`;
                colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
            }

            // Sort colors by frequency and return top N
            const sortedColors = Array.from(colorCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, numColors)
                .map(([colorKey, count]) => {
                    const [h, s, v] = colorKey.split(',').map(Number);
                    const [r, g, b] = this.hsvToRgb(h, s, v);
                    return {
                        rgb: { r, g, b },
                        hsv: { h, s, v },
                        count,
                        percentage: (count / (width * height)) * 100,
                        isGrassLike: this.isGrassColor(h, s, v)
                    };
                });

            return sortedColors;

        } catch (error) {
            console.error('Error extracting dominant colors:', error);
            throw new Error(`Dominant color extraction failed: ${error.message}`);
        }
    }

    /**
     * Create a binary mask where 1 = grass, 0 = not grass
     */
    createGrassMask(rgbData, width, height) {
        const mask = new Uint8Array(width * height);

        for (let i = 0; i < rgbData.length; i += 4) {
            const r = rgbData[i];
            const g = rgbData[i + 1];
            const b = rgbData[i + 2];
            const pixelIndex = i / 4;

            const [h, s, v] = this.rgbToHsv(r, g, b);

            // Check if pixel matches any grass color range
            const isGrass = this.isGrassColor(h, s, v);
            mask[pixelIndex] = isGrass ? 1 : 0;
        }

        return mask;
    }

    /**
     * Check if HSV values match grass color ranges
     */
    isGrassColor(h, s, v) {
        for (const [type, range] of Object.entries(this.grassColorRanges)) {
            if (h >= range.hue.min && h <= range.hue.max &&
                s >= range.saturation.min && s <= range.saturation.max &&
                v >= range.value.min && v <= range.value.max) {
                return true;
            }
        }
        return false;
    }

    /**
     * Apply morphological smoothing to reduce noise
     */
    async smoothMask(mask, width, height, radius = 2) {
        // Simple morphological opening (erosion followed by dilation)
        let smoothed = new Uint8Array(mask);

        // Erosion pass
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                const index = y * width + x;
                let minVal = 1;

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const neighborIndex = (y + dy) * width + (x + dx);
                        if (mask[neighborIndex] < minVal) {
                            minVal = mask[neighborIndex];
                        }
                    }
                }

                smoothed[index] = minVal;
            }
        }

        // Dilation pass
        const dilated = new Uint8Array(smoothed);
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                const index = y * width + x;
                let maxVal = 0;

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const neighborIndex = (y + dy) * width + (x + dx);
                        if (smoothed[neighborIndex] > maxVal) {
                            maxVal = smoothed[neighborIndex];
                        }
                    }
                }

                dilated[index] = maxVal;
            }
        }

        return dilated;
    }

    /**
     * Find connected components of grass pixels
     */
    findGrassClusters(mask, width, height, minSize = 100) {
        const visited = new Set();
        const clusters = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;

                if (mask[index] === 1 && !visited.has(index)) {
                    const cluster = this.floodFill(mask, width, height, x, y, visited);

                    if (cluster.length >= minSize) {
                        clusters.push(cluster);
                    }
                }
            }
        }

        return clusters;
    }

    /**
     * Flood fill algorithm to find connected grass pixels
     */
    floodFill(mask, width, height, startX, startY, visited) {
        const cluster = [];
        const stack = [[startX, startY]];

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const index = y * width + x;

            if (x < 0 || x >= width || y < 0 || y >= height ||
                visited.has(index) || mask[index] !== 1) {
                continue;
            }

            visited.add(index);
            cluster.push({ x, y, index });

            // Add 4-connected neighbors
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        return cluster;
    }

    /**
     * Convert pixel clusters to simplified polygons
     */
    clustersToPolygons(clusters, width, height) {
        return clusters.map((cluster, index) => {
            // Find boundary pixels using a simple approach
            const boundaryPixels = this.findClusterBoundary(cluster, width, height);

            // Convert pixels to normalized coordinates (0-1)
            const normalizedPoints = boundaryPixels.map(pixel => ({
                x: pixel.x / width,
                y: pixel.y / height
            }));

            // Simplify polygon using Douglas-Peucker algorithm
            const simplifiedPoints = this.simplifyPolygon(normalizedPoints, 0.01);

            return {
                id: index,
                points: simplifiedPoints,
                pixelCount: cluster.length,
                area: cluster.length / (width * height) // Relative area
            };
        });
    }

    /**
     * Find boundary pixels of a cluster
     */
    findClusterBoundary(cluster, width, height) {
        const clusterSet = new Set(cluster.map(p => p.index));
        const boundary = [];

        for (const pixel of cluster) {
            const { x, y } = pixel;

            // Check if pixel is on the boundary (has non-cluster neighbor)
            const neighbors = [
                [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
            ];

            let isBoundary = false;
            for (const [nx, ny] of neighbors) {
                if (nx < 0 || nx >= width || ny < 0 || ny >= height ||
                    !clusterSet.has(ny * width + nx)) {
                    isBoundary = true;
                    break;
                }
            }

            if (isBoundary) {
                boundary.push(pixel);
            }
        }

        return boundary.length > 0 ? boundary : cluster;
    }

    /**
     * Simplify polygon using Douglas-Peucker algorithm
     */
    simplifyPolygon(points, tolerance) {
        if (points.length <= 2) return points;

        // Find the point with maximum distance
        let maxDistance = 0;
        let maxIndex = 0;
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];

        for (let i = 1; i < points.length - 1; i++) {
            const distance = this.pointLineDistance(points[i], firstPoint, lastPoint);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }

        // If max distance is greater than tolerance, recursively simplify
        if (maxDistance > tolerance) {
            const leftPart = this.simplifyPolygon(points.slice(0, maxIndex + 1), tolerance);
            const rightPart = this.simplifyPolygon(points.slice(maxIndex), tolerance);

            // Combine results, avoiding duplicate middle point
            return leftPart.slice(0, -1).concat(rightPart);
        } else {
            return [firstPoint, lastPoint];
        }
    }

    /**
     * Calculate distance from point to line
     */
    pointLineDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;

        if (dx === 0 && dy === 0) {
            // Line is actually a point
            return Math.sqrt(
                Math.pow(point.x - lineStart.x, 2) +
                Math.pow(point.y - lineStart.y, 2)
            );
        }

        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
        const clampedT = Math.max(0, Math.min(1, t));

        const projX = lineStart.x + clampedT * dx;
        const projY = lineStart.y + clampedT * dy;

        return Math.sqrt(
            Math.pow(point.x - projX, 2) +
            Math.pow(point.y - projY, 2)
        );
    }

    /**
     * Convert RGB to HSV color space
     */
    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        let h = 0;
        if (delta !== 0) {
            if (max === r) {
                h = ((g - b) / delta) % 6;
            } else if (max === g) {
                h = (b - r) / delta + 2;
            } else {
                h = (r - g) / delta + 4;
            }
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;

        const s = Math.round(max === 0 ? 0 : (delta / max) * 100);
        const v = Math.round(max * 100);

        return [h, s, v];
    }

    /**
     * Convert HSV to RGB color space
     */
    hsvToRgb(h, s, v) {
        h = h % 360;
        s /= 100;
        v /= 100;

        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;

        let r = 0, g = 0, b = 0;

        if (h >= 0 && h < 60) {
            r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; b = c;
        } else if (h >= 300 && h < 360) {
            r = c; g = 0; b = x;
        }

        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }
}

module.exports = ColorAnalysisService;