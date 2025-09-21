# FixtureCast Mobile App

This directory contains the Capacitor configuration to build FixtureCast as a native mobile app.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build the Web App**
   ```bash
   cd .. && npm run build
   cd mobile-app && npm run sync
   ```

3. **Add Platforms**
   ```bash
   npx cap add android
   npx cap add ios
   ```

4. **Open in IDE**
   ```bash
   npx cap open android  # Opens in Android Studio
   npx cap open ios      # Opens in Xcode
   ```

## Features Available

- ✅ Push Notifications
- ✅ Native App Store Deployment
- ✅ Offline Support (PWA features)
- ✅ Native Performance
- ✅ App Store Optimization

## Current Status

This is a template setup. To complete:

1. Install Capacitor CLI: `npm install -g @capacitor/cli`
2. Copy the built web app: `npm run build && npm run sync`
3. Add platforms and build for iOS/Android

## Benefits vs React Native

**Capacitor Advantages:**
- Same codebase as web app
- Faster development
- Easier maintenance
- PWA features included
- Native performance when needed

**React Native Advantages:**
- More native features
- Better performance for complex apps
- More customization options
