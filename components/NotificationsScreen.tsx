import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { databaseNotificationService, DatabaseNotification, NotificationSettings } from '@/lib/notificationService';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<DatabaseNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await databaseNotificationService.initialize();
      
      const [notificationsData, settingsData] = await Promise.all([
        databaseNotificationService.getUserNotifications(50),
        databaseNotificationService.getSettings(),
      ]);
      
      setNotifications(notificationsData);
      setSettings(settingsData);
    } catch (error) {
      console.error('📬 NOTIFICATIONS SCREEN - Error loading data:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const updateSetting = async (key: keyof NotificationSettings, value: any) => {
    if (!settings) return;

    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);

    const success = await databaseNotificationService.updateSettings({ [key]: value });
    if (!success) {
      // Revert on failure
      setSettings(settings);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#007aff';
      case 'delivered': return '#34c759';
      case 'cancelled': return '#8e8e93';
      case 'failed': return '#ff3b30';
      default: return '#8e8e93';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'class_reminder': return 'school';
      case 'exam_reminder': return 'document-text';
      case 'deadline_reminder': return 'time';
      case 'custom': return 'notifications';
      default: return 'notifications';
    }
  };

  const renderNotification = (notification: DatabaseNotification) => (
    <View key={notification.id} style={styles.notificationCard}>
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIcon}>
          <Ionicons 
            name={getTypeIcon(notification.type) as any} 
            size={20} 
            color="#667eea" 
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationBody}>{notification.body}</Text>
          <Text style={styles.notificationTime}>
            Scheduled: {formatDate(notification.scheduled_for)}
          </Text>
          {notification.delivered_at && (
            <Text style={styles.notificationTime}>
              Delivered: {formatDate(notification.delivered_at)}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(notification.status) }]}>
          <Text style={styles.statusText}>{notification.status}</Text>
        </View>
      </View>
    </View>
  );

  const renderSettings = () => {
    if (!settings) return null;

    return (
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Enable Notifications</Text>
          <Switch
            value={settings.enabled}
            onValueChange={(value) => updateSetting('enabled', value)}
            trackColor={{ false: '#d1d1d6', true: '#667eea' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Class Reminders</Text>
          <Switch
            value={settings.class_reminders_enabled}
            onValueChange={(value) => updateSetting('class_reminders_enabled', value)}
            trackColor={{ false: '#d1d1d6', true: '#667eea' }}
            thumbColor="#ffffff"
            disabled={!settings.enabled}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Exam Reminders</Text>
          <Switch
            value={settings.exam_reminders_enabled}
            onValueChange={(value) => updateSetting('exam_reminders_enabled', value)}
            trackColor={{ false: '#d1d1d6', true: '#667eea' }}
            thumbColor="#ffffff"
            disabled={!settings.enabled}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Deadline Reminders</Text>
          <Switch
            value={settings.deadline_reminders_enabled}
            onValueChange={(value) => updateSetting('deadline_reminders_enabled', value)}
            trackColor={{ false: '#d1d1d6', true: '#667eea' }}
            thumbColor="#ffffff"
            disabled={!settings.enabled}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Weekend Notifications</Text>
          <Switch
            value={settings.weekend_notifications}
            onValueChange={(value) => updateSetting('weekend_notifications', value)}
            trackColor={{ false: '#d1d1d6', true: '#667eea' }}
            thumbColor="#ffffff"
            disabled={!settings.enabled}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Default Reminder Time</Text>
          <Text style={styles.settingValue}>{settings.default_reminder_minutes} minutes before</Text>
        </View>
      </View>
    );
  };

  const groupedNotifications = notifications.reduce((acc, notification) => {
    const status = notification.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(notification);
    return acc;
  }, {} as Record<string, DatabaseNotification[]>);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={styles.cleanupButton}
          onPress={() => databaseNotificationService.cleanupOldNotifications()}
        >
          <Ionicons name="refresh" size={20} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {/* Settings Section */}
        {renderSettings()}

        {/* Notifications Section */}
        <View style={styles.notificationsSection}>
          <Text style={styles.sectionTitle}>Your Notifications ({notifications.length})</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off" size={48} color="#8e8e93" />
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubtext}>
                Notifications will appear here when you add courses with reminders enabled
              </Text>
            </View>
          ) : (
            Object.entries(groupedNotifications).map(([status, statusNotifications]) => (
              <View key={status} style={styles.statusGroup}>
                <Text style={styles.statusGroupTitle}>
                  {status.charAt(0).toUpperCase() + status.slice(1)} ({statusNotifications.length})
                </Text>
                {statusNotifications.map(renderNotification)}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  cleanupButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 120, // Extra padding for tab bar and safe areas
    flexGrow: 1,
  },
  settingsSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  settingLabel: {
    fontSize: 16,
    color: '#1d1d1f',
    flex: 1,
  },
  settingValue: {
    fontSize: 14,
    color: '#8e8e93',
    fontWeight: '500',
  },
  notificationsSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusGroup: {
    marginBottom: 20,
  },
  statusGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 12,
  },
  notificationCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 2,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8e8e93',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingBottom: 60, // Extra space for better visual balance
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8e8e93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});

export default NotificationsScreen;
