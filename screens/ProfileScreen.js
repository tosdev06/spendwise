import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Flag to enable/disable notifications
const ENABLE_NOTIFICATIONS = true;

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [dailyRemindersActive, setDailyRemindersActive] = useState(false); // Reflects user's choice for reminders
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalExpenses: 0,
    monthlyAverage: 0,
    categoriesUsed: 0,
  });

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      if (ENABLE_NOTIFICATIONS) {
        checkNotificationPermissions(); // Check permission status
        loadDailyRemindersSetting(); // Load user's preference
      }
    }, [])
  );

  const loadUserData = async () => {
    setStatsLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setUser(userData || authUser);

      // Load stats
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', authUser.id);

      if (expenses && expenses.length > 0) {
        const total = expenses.length;
        const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const categories = new Set(expenses.map(exp => exp.category));

        // Improved monthly average calculation
        const userStartDate = new Date(authUser.created_at);
        const now = new Date();
        const monthsActive = (now.getFullYear() - userStartDate.getFullYear()) * 12 + (now.getMonth() - userStartDate.getMonth()) + 1;
        const monthlyAverage = totalAmount / Math.max(1, monthsActive);

        setStats({
          totalExpenses: total,
          monthlyAverage: monthlyAverage,
          categoriesUsed: categories.size,
        });
      } else {
        // Reset stats if there are no expenses
        setStats({ totalExpenses: 0, monthlyAverage: 0, categoriesUsed: 0 });
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const checkNotificationPermissions = async () => {
    if (!ENABLE_NOTIFICATIONS) return;
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
  };

  const loadDailyRemindersSetting = async () => {
    try {
      const setting = await AsyncStorage.getItem('daily_reminders_active');
      setDailyRemindersActive(setting === 'true');
    } catch (error) {
      console.error('Error loading daily reminders setting:', error);
      setDailyRemindersActive(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!ENABLE_NOTIFICATIONS) {
      Alert.alert(
        'Notifications Unavailable',
        'Push notifications require a development build. Use "npx expo prebuild" to create one.',
        [{ text: 'OK' }]
      );
      return;
    }

    // User wants to enable reminders
    let permissionGranted = notificationsEnabled; // Start with current permission status
    if (!permissionGranted) {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      permissionGranted = newStatus === 'granted';
      setNotificationsEnabled(permissionGranted); // Update permission status
    }

    if (permissionGranted) {
      await scheduleDailyReminder();
      setDailyRemindersActive(true); // Explicitly set active state
      Alert.alert('Success', 'Daily reminders enabled!'); // Provide feedback
    } else {
      Alert.alert('Permission Denied', 'You can enable notifications from your device settings.');
      setDailyRemindersActive(false); // Ensure switch is off if permission denied
    }
  };

  const scheduleDailyReminder = async () => {
    if (!ENABLE_NOTIFICATIONS) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📊 Time to log your expenses!",
        body: "Don't forget to track today's spending for better budgeting.",
        sound: true,
        data: { type: 'daily_reminder' },
      },
      trigger: {
        hour: 20, // 8 PM (20:00)
        minute: 0,
        repeats: true,
      },
    });
    await AsyncStorage.setItem('daily_reminders_active', 'true');
    console.log('Daily reminders scheduled.');
  };

  const cancelDailyReminders = async () => {
    if (!ENABLE_NOTIFICATIONS) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.setItem('daily_reminders_active', 'false');
    console.log('Daily reminders cancelled.');
  };

  const toggleDailyReminders = async (newValue) => {
    if (!ENABLE_NOTIFICATIONS) {
      Alert.alert(
        'Notifications Unavailable',
        'Push notifications require a development build. Use "npx expo prebuild" to create one.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (newValue) {
      // User wants to enable reminders
      let { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        // Request permission if not already granted
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        status = newStatus;
      }

      setNotificationsEnabled(status === 'granted'); // Update permission status

      if (status === 'granted') {
        await scheduleDailyReminder();
        setDailyRemindersActive(true);
        Alert.alert('Success', 'Daily reminders have been enabled!');
      } else {
        // If permission is still not granted, inform the user and keep the switch off
        Alert.alert('Permission Denied', 'You can enable notifications from your device settings.');
        setDailyRemindersActive(false);
      }
    } else {
      // User wants to disable reminders
      await cancelDailyReminders();
      setDailyRemindersActive(false);
      Alert.alert('Success', 'Daily reminders have been disabled.');
    }
  };
  const syncOfflineData = async () => {
    setSyncInProgress(true);
    try {
      const syncQueueJSON = await AsyncStorage.getItem('sync_queue');
      const syncQueue = syncQueueJSON ? JSON.parse(syncQueueJSON) : [];

      if (syncQueue.length === 0) {
        Alert.alert('Info', 'No offline data to sync');
        return;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      let syncedCount = 0;
      let failedCount = 0;

      for (const item of syncQueue) {
        try {
          if (item.operation === 'INSERT') {
            const { error } = await supabase
              .from(item.table_name)
              .insert([{ ...item.data, user_id: authUser.id }]);

            if (error) throw error;
          }
          // Handle UPDATE and DELETE operations similarly

          syncedCount++;
        } catch (error) {
          console.error('Sync error:', error);
          failedCount++;
        }
      }

      // Clear synced items
      await AsyncStorage.removeItem('sync_queue');

      Alert.alert(
        'Sync Complete',
        `Synced ${syncedCount} items. ${failedCount} failed.`
      );

      // Refresh data
      loadUserData();

    } catch (error) {
      Alert.alert('Sync Error', error.message);
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            navigation.replace('Auth');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user: authUser } } = await supabase.auth.getUser();
              if (!authUser) return;

              // Delete user data from all tables
              await supabase.from('expenses').delete().eq('user_id', authUser.id);
              await supabase.from('budgets').delete().eq('user_id', authUser.id);
              await supabase.from('users').delete().eq('id', authUser.id);

              // Delete from auth
              await supabase.auth.admin.deleteUser(authUser.id);

              // Clear local storage
              await AsyncStorage.clear();

              Alert.alert('Account Deleted', 'Your account has been deleted successfully.');
              navigation.replace('Auth');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount) => {
    return `₦${parseFloat(amount).toFixed(2)}`;
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user.name || 'Student'}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.userSince}>
              Member since {new Date(user.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>


      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        {/* Notifications - Disabled for Expo Go */}
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications" size={24} color="#6366F1" />
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Daily Reminders</Text>
              <Text style={styles.settingDescription}>
                {ENABLE_NOTIFICATIONS
                  ? 'Get reminded to log expenses daily'
                  : 'Requires development build in Expo Go'}
              </Text>
              <Text style={styles.settingDescription}>
                {dailyRemindersActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <Switch
            value={dailyRemindersActive}
            onValueChange={toggleDailyReminders}
            trackColor={{ false: '#CBD5E1', true: '#6366F1' }}
            thumbColor="#FFFFFF"
            disabled={!ENABLE_NOTIFICATIONS}
          />
        </View>

        {/* Sync Offline Data */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={syncOfflineData}
          disabled={syncInProgress}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="sync" size={24} color={syncInProgress ? '#94A3B8' : '#10B981'} />
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Sync Offline Data</Text>
              <Text style={styles.settingDescription}>
                {syncInProgress ? 'Syncing...' : 'Upload pending expenses'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* Export Data */}
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="download" size={24} color="#F59E0B" />
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Export Data</Text>
              <Text style={styles.settingDescription}>
                Download all your expense data
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* Privacy */}
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="lock-closed" size={24} color="#EF4444" />
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Privacy & Security</Text>
              <Text style={styles.settingDescription}>
                Manage your data and security
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        <TouchableOpacity style={styles.supportItem}>
          <Ionicons name="help-circle" size={20} color="#6366F1" />
          <Text style={styles.supportText}>Help & FAQ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportItem}>
          <Ionicons name="chatbubble" size={20} color="#6366F1" />
          <Text style={styles.supportText}>Contact Support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportItem}>
          <Ionicons name="star" size={20} color="#6366F1" />
          <Text style={styles.supportText}>Rate the App</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={styles.dangerZone}>
        <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#EF4444" />
          <Text style={styles.dangerButtonText}>Logout</Text>
        </TouchableOpacity>

      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appName}>Student Expense Manager</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.appTagline}>Track. Save. Succeed.</Text>
        <Text style={styles.appCopyright}>© 2025 SE C6 400level.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  userSince: {
    fontSize: 12,
    color: '#94A3B8',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#64748B',
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  supportText: {
    fontSize: 16,
    color: '#475569',
    flex: 1,
  },
  dangerZone: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  dangerZoneTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
    gap: 12,
  },
  dangerButtonText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  appInfo: {
    alignItems: 'center',
    padding: 32,
    paddingBottom: 48,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  appCopyright: {
    fontSize: 12,
    color: '#CBD5E1',
  },
});