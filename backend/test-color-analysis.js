const ColorAnalysisService = require('./services/color-analysis-service');
const ImageCaptureService = require('./services/image-capture');

async function testColorAnalysis() {
    console.log('🎨 Testing Color-Based Grass Detection\n');

    const colorService = new ColorAnalysisService();
    const imageService = new ImageCaptureService();

    try {
        // Test with a sample location (adjust as needed)
        const testLocation = {
            lat: 37.7749,
            lng: -122.4194,
            zoom: 20
        };

        console.log(`📍 Capturing satellite image for ${testLocation.lat}, ${testLocation.lng}`);

        const imageResult = await imageService.captureImage({
            lat: testLocation.lat,
            lng: testLocation.lng,
            zoom: testLocation.zoom,
            size: '640x640'
        });

        console.log(`✅ Image captured: ${imageResult.image.width}x${imageResult.image.height}`);

        // Analyze colors
        console.log('\n🔬 Analyzing grass colors...');
        const colorAnalysis = await colorService.analyzeGrassColors(imageResult.image.data, {
            minGrassPercentage: 3,
            smoothingRadius: 1,
            minClusterSize: 50
        });

        // Extract dominant colors
        console.log('🌈 Extracting dominant colors...');
        const dominantColors = await colorService.extractDominantColors(imageResult.image.data, 5);

        // Display results
        console.log('\n📊 ANALYSIS RESULTS:');
        console.log(`  Grass Coverage: ${colorAnalysis.grassPercentage.toFixed(1)}%`);
        console.log(`  Grass Pixels: ${colorAnalysis.totalGrassPixels.toLocaleString()}`);
        console.log(`  Total Pixels: ${colorAnalysis.totalPixels.toLocaleString()}`);
        console.log(`  Grass Clusters Found: ${colorAnalysis.clustersFound}`);
        console.log(`  Polygons Generated: ${colorAnalysis.polygons.length}`);

        console.log('\n🎨 DOMINANT COLORS:');
        dominantColors.forEach((color, i) => {
            const isGrass = color.isGrassLike ? '🌱' : '  ';
            console.log(`  ${i + 1}. ${isGrass} RGB(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}) - ${color.percentage.toFixed(1)}%`);
        });

        console.log('\n🌿 GRASS COLOR RANGES USED:');
        Object.entries(colorService.grassColorRanges).forEach(([type, range]) => {
            console.log(`  ${type}:`);
            console.log(`    Hue: ${range.hue.min}-${range.hue.max}°`);
            console.log(`    Saturation: ${range.saturation.min}-${range.saturation.max}%`);
            console.log(`    Value: ${range.value.min}-${range.value.max}%`);
        });

        if (colorAnalysis.polygons.length > 0) {
            console.log('\n📐 DETECTED AREAS:');
            colorAnalysis.polygons.forEach((polygon, i) => {
                console.log(`  Area ${i + 1}: ${polygon.pixelCount} pixels (${(polygon.area * 100).toFixed(2)}% of image)`);
            });
        }

        console.log('\n✅ Color analysis test completed successfully!');

        console.log('\n📷 COMPARISON WITH VISION-BASED DETECTION:');
        console.log('  Vision path: Uses a model on satellite imagery for boundaries and context');
        console.log('  Color Approach: Uses direct color analysis, faster, no API costs');
        console.log('  Color Approach: More consistent results, adjustable parameters');
        console.log(`  Color Coverage: ${colorAnalysis.grassPercentage.toFixed(1)}% of image detected as grass`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.message.includes('API key')) {
            console.log('\n💡 Note: Make sure your .env file has GOOGLE_MAPS_API_KEY set');
        }
    }
}

// Run the test
testColorAnalysis();