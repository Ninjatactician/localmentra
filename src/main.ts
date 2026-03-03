// Combined MentraOS app with both Notes and Home Assistant functionality
import { CombinedApp } from './combined-app.ts';

// Create and start the app
const app = new CombinedApp({
  packageName: process.env.PACKAGE_NAME || 'com.mentra.combinedapp',
  apiKey: process.env.MENTRAOS_API_KEY || 'mock-api-key',
  port: parseInt(process.env.PORT || '3002', 10)
});

// Start the app
app.start();

console.log("Combined Notes & Home Assistant App is running...");