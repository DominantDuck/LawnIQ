const ColorAnalysisService = require('./services/color-analysis-service');
const sharp = require('sharp');

async function testColorAnalysisSimple() {
    console.log('🎨 Testing Color Analysis Service (No API Required)\n');

    const colorService = new ColorAnalysisService();

    try {
        // Create a simple test image with green and brown areas
        console.log('🖼️  Creating test image with grass-like colors...');

        // Create a 200x200 test image with different colored regions
        const width = 200;
        const height = 200;
        const channels = 3;

        // Create image buffer with different colored regions
        const imageBuffer = Buffer.alloc(width * height * channels);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * channels;

                if (x < width / 3) {
                    // Left third: healthy green grass (RGB: 34, 139, 34)
                    imageBuffer[idx] = 34;     // R
                    imageBuffer[idx + 1] = 139; // G
                    imageBuffer[idx + 2] = 34;  // B
                } else if (x < 2 * width / 3) {
                    // Middle third: brown/dormant grass (RGB: 139, 69, 19)
                    imageBuffer[idx] = 139;    // R
                    imageBuffer[idx + 1] = 69;  // G
                    imageBuffer[idx + 2] = 19;  // B
                } else {
                    // Right third: concrete/non-grass (RGB: 128, 128, 128)
                    imageBuffer[idx] = 128;    // R
                    imageBuffer[idx + 1] = 128; // G
                    imageBuffer[idx + 2] = 128; // B
                }
            }
        }

        // Convert to proper image format
        const pngBuffer = await sharp(imageBuffer, {
            raw: {
                width: width,
                height: height,
                channels: channels
            }
        }).png().toBuffer();

        console.log('✅ Test image created (Green | Brown | Gray regions)\n');

        // Test color analysis
        console.log('🔬 Analyzing colors...');
        const colorAnalysis = await colorService.analyzeGrassColors(pngBuffer, {
            minGrassPercentage: 5,
            smoothingRadius: 1,
            minClusterSize: 20
        });

        // Extract dominant colors
        console.log('🌈 Extracting dominant colors...');
        const dominantColors = await colorService.extractDominantColors(pngBuffer, 5);

        // Display results
        console.log('📊 ANALYSIS RESULTS:');
        console.log(`  Image Size: ${width}x${height} pixels`);
        console.log(`  Grass Coverage: ${colorAnalysis.grassPercentage.toFixed(1)}%`);
        console.log(`  Grass Pixels: ${colorAnalysis.totalGrassPixels.toLocaleString()}`);
        console.log(`  Expected: ~66.7% (green + brown regions)`);
        console.log(`  Grass Clusters: ${colorAnalysis.clustersFound}`);
        console.log(`  Polygons Generated: ${colorAnalysis.polygons.length}`);

        console.log('\n🎨 DOMINANT COLORS:');
        dominantColors.forEach((color, i) => {
            const isGrass = color.isGrassLike ? '🌱' : '⬜';
            const [h, s, v] = [color.hsv.h, color.hsv.s, color.hsv.v];
            console.log(`  ${i + 1}. ${isGrass} RGB(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}) HSV(${h}°,${s}%,${v}%) - ${color.percentage.toFixed(1)}%`);
        });

        console.log('\n🌿 COLOR DETECTION BREAKDOWN:');

        // Test individual color detection
        const testColors = [
            { name: 'Healthy Grass', rgb: [34, 139, 34] },
            { name: 'Brown Grass', rgb: [139, 69, 19] },
            { name: 'Gray Concrete', rgb: [128, 128, 128] },
            { name: 'Dry Grass', rgb: [218, 165, 32] }
        ];

        testColors.forEach(color => {
            const [h, s, v] = colorService.rgbToHsv(color.rgb[0], color.rgb[1], color.rgb[2]);
            const isGrass = colorService.isGrassColor(h, s, v);
            const result = isGrass ? '✅ GRASS' : '❌ NOT GRASS';
            console.log(`  ${color.name}: HSV(${h}°,${s}%,${v}%) → ${result}`);
        });

        if (colorAnalysis.polygons.length > 0) {
            console.log('\n📐 DETECTED AREAS:');
            colorAnalysis.polygons.forEach((polygon, i) => {
                const percentage = (polygon.area * 100).toFixed(1);
                console.log(`  Area ${i + 1}: ${polygon.pixelCount} pixels (${percentage}% of image)`);
            });
        }

        // Performance check
        console.log('\n⚡ PERFORMANCE:');
        const start = Date.now();
        await colorService.analyzeGrassColors(pngBuffer);
        const end = Date.now();
        console.log(`  Analysis Time: ${end - start}ms`);

        console.log('\n✅ Simple color analysis test completed successfully!');
        console.log('\n💡 Next Steps:');
        console.log('  1. Set up Google Maps API key to test with real satellite images');
        console.log('  2. Start the backend server: npm start');
        console.log('  3. Test API endpoints with curl or the frontend');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testColorAnalysisSimple();