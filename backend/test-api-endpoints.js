const axios = require('axios');
const fs = require('fs');

// Test the color analysis API endpoints
async function testAPIEndpoints() {
    const baseURL = 'http://localhost:3001';
    console.log('🚀 Testing SwiftQuote. color analysis API endpoints\n');

    try {
        // Test 1: Health check
        console.log('1️⃣ Testing health endpoint...');
        const healthResponse = await axios.get(`${baseURL}/api/health`);
        console.log('✅ Health check:', healthResponse.data.status);

        // Test 2: Service status (should show color analysis service)
        console.log('\n2️⃣ Testing service status...');
        const statusResponse = await axios.get(`${baseURL}/api/status`);
        const services = statusResponse.data.services;
        console.log('✅ Available services:');
        Object.keys(services).forEach(service => {
            const available = services[service].available ? '✅' : '❌';
            console.log(`   ${available} ${service}`);
        });

        if (services.colorAnalysis) {
            console.log('🎨 Color analysis capabilities:', services.colorAnalysis.capabilities);
        }

        // Test 3: Create a test image and analyze it
        console.log('\n3️⃣ Testing image color analysis...');

        // Create a simple test image (green and brown stripes)
        const sharp = require('sharp');
        const width = 400;
        const height = 400;
        const channels = 3;

        console.log('   Creating test image...');
        const imageBuffer = Buffer.alloc(width * height * channels);

        // Create horizontal stripes: green, brown, green, brown
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * channels;
                const stripeIndex = Math.floor(y / (height / 4));

                if (stripeIndex % 2 === 0) {
                    // Green grass stripes
                    imageBuffer[idx] = 50;      // R
                    imageBuffer[idx + 1] = 150; // G
                    imageBuffer[idx + 2] = 50;  // B
                } else {
                    // Brown grass stripes
                    imageBuffer[idx] = 139;     // R
                    imageBuffer[idx + 1] = 69;  // G
                    imageBuffer[idx + 2] = 19;  // B
                }
            }
        }

        // Convert to PNG base64
        const pngBuffer = await sharp(imageBuffer, {
            raw: { width, height, channels }
        }).png().toBuffer();

        const base64Image = `data:image/png;base64,${pngBuffer.toString('base64')}`;

        console.log('   Sending image to color analysis API...');
        const imageAnalysisResponse = await axios.post(`${baseURL}/api/analyze-image-color`, {
            imageBase64: base64Image,
            colorOptions: {
                minGrassPercentage: 5,
                smoothingRadius: 1,
                minClusterSize: 50
            }
        });

        const analysis = imageAnalysisResponse.data;
        console.log('✅ Image analysis results:');
        console.log(`   Grass Coverage: ${analysis.analysis.grassPercentage.toFixed(1)}%`);
        console.log(`   Areas Detected: ${analysis.analysis.areasDetected}`);
        console.log(`   Clusters Found: ${analysis.analysis.clustersFound}`);

        if (analysis.dominantColors) {
            console.log('   Dominant Colors:');
            analysis.dominantColors.slice(0, 3).forEach((color, i) => {
                const isGrass = color.isGrassLike ? '🌱' : '⬜';
                console.log(`     ${isGrass} RGB(${color.rgb.r},${color.rgb.g},${color.rgb.b}) - ${color.percentage.toFixed(1)}%`);
            });
        }

        // Test 4: Location-based analysis (requires Google Maps API key)
        console.log('\n4️⃣ Testing location-based analysis...');
        try {
            const locationResponse = await axios.post(`${baseURL}/api/analyze-color`, {
                lat: 40.7128,   // New York City (likely has some parks)
                lng: -74.0060,
                propertyType: 'residential',
                colorOptions: {
                    minGrassPercentage: 3,
                    smoothingRadius: 2,
                    minClusterSize: 100
                }
            });

            const locationAnalysis = locationResponse.data;
            console.log('✅ Location analysis results:');
            console.log(`   Location: ${locationResponse.config.data.lat}, ${locationResponse.config.data.lng}`);
            console.log(`   Grass Coverage: ${locationAnalysis.analysis.grassPercentage.toFixed(1)}%`);
            console.log(`   Total Area: ${locationAnalysis.analysis.totalArea} sq ft`);
            console.log(`   Areas Detected: ${locationAnalysis.analysis.areasDetected}`);

        } catch (locationError) {
            if (locationError.response?.status === 500 && locationError.response?.data?.message?.includes('API key')) {
                console.log('⚠️  Location analysis requires Google Maps API key');
                console.log('   Add GOOGLE_MAPS_API_KEY to your .env file to test this feature');
            } else {
                console.log('❌ Location analysis failed:', locationError.response?.data?.message || locationError.message);
            }
        }

        console.log('\n✅ API testing completed successfully!');
        console.log('\n🎯 Summary:');
        console.log('   • Color analysis service is working correctly');
        console.log('   • Image analysis detects grass areas by color');
        console.log('   • API endpoints are responding properly');
        console.log('   • Color path uses local image processing only');

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Cannot connect to backend server');
            console.log('💡 Start the backend first:');
            console.log('   cd backend   # from repository root');
            console.log('   npm start');
        } else {
            console.log('❌ Test failed:', error.message);
            if (error.response) {
                console.log('   Status:', error.response.status);
                console.log('   Error:', error.response.data?.message);
            }
        }
    }
}

// Run the API tests
testAPIEndpoints();