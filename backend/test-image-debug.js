const dotenv = require('dotenv');
const ImageCaptureService = require('./services/image-capture');

// Load environment variables
dotenv.config();

async function testImageCapture() {
  const imageCaptureService = new ImageCaptureService();

  console.log('Google Maps API Key:', process.env.GOOGLE_MAPS_API_KEY ? 'Set' : 'Not set');
  console.log('API Key length:', process.env.GOOGLE_MAPS_API_KEY?.length || 0);

  try {
    const result = await imageCaptureService.captureImage({
      lat: 37.7749,
      lng: -122.4194,
      zoom: 20,
      size: '640x640'
    });
    console.log('✅ Image capture successful');
    console.log('Image size:', result.image.data.length, 'bytes');
  } catch (error) {
    console.error('❌ Image capture failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data?.toString());
    }
  }
}

testImageCapture();