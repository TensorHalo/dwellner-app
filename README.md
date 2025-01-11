# Dwellner Mobile App

## Overview
Dwellner is a mobile application built with React Native and Expo.

## Prerequisites
- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

## Getting Started

### Installation

1. Navigate to the project directory:
   ```bash
   cd dwellner-app
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

### Development

#### Setting up iOS Simulator
Follow the official Expo documentation to set up your iOS simulator:
[iOS Simulator Setup Guide](https://docs.expo.dev/workflow/ios-simulator/)

#### Running the App

1. Start the development server:
   ```bash
   npx expo start
   ```

2. A link starting with `exp://` and an IP address will be displayed in the terminal.

3. Open the Expo Go app in your iOS simulator and paste the link to run the application.

### Building Native Apps

#### iOS Build
```bash
npx expo run:ios
```

#### Android Build
```bash
npx expo run:android
```

Required dependencies and packages will be automatically installed during the build process.

## Troubleshooting

If you encounter any issues during setup or running the app, make sure:
- All prerequisites are properly installed
- You're in the correct directory
- Your simulator/emulator is running before starting the app

## Additional Resources
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)