import React, { useEffect, useCallback } from 'react';
import { oneSignalService } from './src/services/OneSignalService';
import DeviceInfo from 'react-native-device-info';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

function AppContent(): React.JSX.Element {
  const checkAppVersion = useCallback(async () => {
    try {
      const currentVersion = DeviceInfo.getVersion();
      const buildNumber = DeviceInfo.getBuildNumber();
      console.log(`App Version: ${currentVersion} (${buildNumber})`);
    } catch (error) {
      console.error('Error checking app version:', error);
    }
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await checkAppVersion();
        
        try {
          await oneSignalService.initialize();
        } catch (oneSignalError) {
          console.error('Error initializing OneSignal:', oneSignalError);
        }
      } catch (error) {
        console.error('Error during app initialization:', error);
      }
    };
    
    initializeApp();
  }, [checkAppVersion]);

  return <AppNavigator />;
}

// Wrap the entire app with ErrorBoundary
function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
