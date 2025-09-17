#!/bin/bash

# MIIN-Ojibwe Android Release APK Build Script
# This script builds a signed release APK for testing

set -e  # Exit on any error

echo "🚀 Building MIIN-Ojibwe Android Release APK..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the React Native project root.${NC}"
    exit 1
fi

# Check if Android directory exists
if [ ! -d "android" ]; then
    echo -e "${RED}❌ Error: android directory not found.${NC}"
    exit 1
fi

# Check if keystore exists
if [ ! -f "android/keystores/upload-keystore.jks" ]; then
    echo -e "${RED}❌ Error: Keystore not found at android/keystores/upload-keystore.jks${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Step 1: Installing dependencies...${NC}"
npm install

echo -e "${BLUE}🧹 Step 2: Cleaning previous builds...${NC}"
cd android
./gradlew clean
cd ..

echo -e "${BLUE}🔨 Step 3: Building release APK...${NC}"
cd android
./gradlew assembleRelease

# Check if build was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
    
    # Find the generated APK
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
    
    if [ -f "$APK_PATH" ]; then
        # Get APK info
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        
        echo -e "${GREEN}📱 Release APK generated successfully!${NC}"
        echo -e "${YELLOW}📍 Location: $APK_PATH${NC}"
        echo -e "${YELLOW}📏 Size: $APK_SIZE${NC}"
        
        # Create a more accessible copy
        RELEASE_DIR="release-builds"
        mkdir -p "$RELEASE_DIR"
        
        # Get current timestamp
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        NEW_APK_NAME="MIIN-Ojibwe-v1.0.6-${TIMESTAMP}.apk"
        
        cp "$APK_PATH" "$RELEASE_DIR/$NEW_APK_NAME"
        
        echo -e "${GREEN}📋 APK copied to: $RELEASE_DIR/$NEW_APK_NAME${NC}"
        echo ""
        echo -e "${BLUE}🔧 Installation Instructions:${NC}"
        echo "1. Transfer the APK to your Android device"
        echo "2. Enable 'Install from unknown sources' in Android settings"
        echo "3. Tap the APK file to install"
        echo "4. Test the notification functionality"
        echo ""
        echo -e "${YELLOW}⚠️  Note: This is a signed release APK with the notification fixes applied.${NC}"
        
    else
        echo -e "${RED}❌ Error: APK file not found at expected location.${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Build failed. Check the error messages above.${NC}"
    exit 1
fi

cd ..

echo -e "${GREEN}🎉 Release APK build completed successfully!${NC}"
