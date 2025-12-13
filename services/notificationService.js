import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

class NotificationService {
  constructor() {
    this.setupNotifications();
  }

  async setupNotifications() {
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('expense-reminders', {
        name: 'Expense Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }
  }

  async requestPermissions() {
    const { status } = await Notifications.getPermissionsAsync();
    
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      return newStatus === 'granted';
    }
    
    return true;
  }

  async scheduleDailyReminder() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return false;
    }

    // Cancel any existing reminders
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule daily reminder at 8 PM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📊 Time to log your expenses!",
        body: "Don't forget to track today's spending for better budgeting.",
        sound: true,
        data: { type: 'daily_reminder', screen: 'AddExpense' },
        categoryIdentifier: 'expense-reminders',
      },
      trigger: {
        hour: 20, // 8 PM
        minute: 0,
        repeats: true,
      },
    });

    console.log('Daily reminders scheduled');
    return true;
  }

  // Setup notification listeners for navigation
  setupNotificationListeners(navigation) {
    // Notification received while app is foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // User tapped notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data.screen) {
        navigation.navigate(data.screen);
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }

  async cancelAllReminders() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All reminders cancelled');
  }
}

export default new NotificationService();