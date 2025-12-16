import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './navigation/AppNavigator';
import SyncService from './services/syncService';
import { supabase } from './lib/supabase';

// 🔍 ADD THIS - Enable detailed error logging
LogBox.ignoreLogs(['Warning: Failed prop type']); // Temporary

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Auth');
  const [lastError, setLastError] = useState(null); // 🔍 ADD THIS

  // 🔍 ADD THIS - Error boundary effect
  useEffect(() => {
    const originalErrorHandler = ErrorUtils.getGlobalHandler();
    
    const myErrorHandler = (error, isFatal) => {
      console.log('🔴 ERROR DETAILS:', error.message);
      console.log('🔴 ERROR STACK:', error.stack);
      console.log('🔴 IS FATAL:', isFatal);
      
      // Try to extract component info
      const stackLines = error.stack?.split('\n') || [];
      stackLines.forEach(line => {
        if (line.includes('.js') && !line.includes('node_modules')) {
          console.log('🔴 SUSPECT FILE:', line.trim());
        }
      });
      
      setLastError(error.message);
      originalErrorHandler(error, isFatal);
    };
    
    ErrorUtils.setGlobalHandler(myErrorHandler);
    
    return () => {
      ErrorUtils.setGlobalHandler(originalErrorHandler);
    };
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('Initializing app...');
        
        // Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session check:', session ? 'Logged in' : 'Not logged in');

        if (session) {
          setInitialRoute('Main');

          // Start background sync
          if (SyncService.checkAndSync) {
            SyncService.checkAndSync();
          }

          // Setup periodic sync every 5 minutes
          const interval = setInterval(() => {
            if (SyncService.checkAndSync) {
              SyncService.checkAndSync();
            }
          }, 5 * 60 * 1000);
          
          return () => clearInterval(interval);
        }

        // Load any cached data
        await loadCachedData();

        // Add a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('App initialization complete');
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const loadCachedData = async () => {
    try {
      const cachedData = await AsyncStorage.getItem('app_cache');
      if (cachedData) {
        console.log('Loaded cached data');
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  if (!appIsReady) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>spendwise..........</Text>
      </View>
    );
  }

  // 🔍 ADD THIS - Show error details
  if (lastError) {
    return (
      <View style={[styles.container, {padding: 20}]}>
        <Text style={{color: 'red', fontSize: 16, fontWeight: 'bold', marginBottom: 10}}>
          Error Occurred:
        </Text>
        <Text style={{color: 'black', marginBottom: 20}}>{lastError}</Text>
        <Text style={{color: 'blue'}}>
          Check terminal/console for file details
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AppNavigator initialRouteName={initialRoute} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 18,
    color: '#6366F1',
    fontWeight: '600',
  }
});