#!/bin/bash

echo "🚀 Building SMS Gateway APK for Android 15"
echo "=========================================="
echo ""

# Check if Android directory exists
if [ ! -d "android" ]; then
    echo "⚠️  Android directory not found. Running prebuild..."
    npx expo prebuild --platform android --clean
fi

echo ""
echo "📦 Building APK..."
echo ""

# Build with Gradle
cd android
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📍 APK location: android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "To install on connected device:"
    echo "  adb install android/app/build/outputs/apk/debug/app-debug.apk"
else
    echo ""
    echo "❌ Build failed"
    exit 1
fi
