import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import NotificationsScreen from '@/components/NotificationsScreen';
import { ContentFeed } from '@/components/ContentFeed';
import { ContentDetailModal } from '@/components/ContentDetailModal';
import { Content } from '@/lib/contentService';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';

export default function NotificationsTab() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'content'>('notifications');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [contentModalVisible, setContentModalVisible] = useState(false);
  
  // Theme and font contexts
  const { isDark, theme } = useTheme();
  const { fontSizes } = useFontSize();

  useEffect(() => {
    console.log('🔔 NOTIFICATIONS TAB - Component mounted/rendered');
  }, []);

  console.log('🔔 NOTIFICATIONS TAB - Render called');

  const handleContentPress = (content: Content) => {
    setSelectedContent(content);
    setContentModalVisible(true);
  };

  const styles = getStyles(theme, fontSizes, isDark);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text style={styles.headerTitle}>Updates</Text>
        <Text style={styles.headerSubtitle}>
          Stay informed with notifications and campus news
        </Text>
      </LinearGradient>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Ionicons 
            name={activeTab === 'notifications' ? 'notifications' : 'notifications-outline'} 
            size={20} 
            color={activeTab === 'notifications' ? theme.primary : theme.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
            Notifications
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'content' && styles.activeTab]}
          onPress={() => setActiveTab('content')}
        >
          <Ionicons 
            name={activeTab === 'content' ? 'newspaper' : 'newspaper-outline'} 
            size={20} 
            color={activeTab === 'content' ? theme.primary : theme.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'content' && styles.activeTabText]}>
            Campus News
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'notifications' ? (
          <NotificationsScreen />
        ) : (
          <ContentFeed onContentPress={handleContentPress} />
        )}
      </View>

      {/* Content Detail Modal */}
      <ContentDetailModal
        visible={contentModalVisible}
        content={selectedContent}
        onClose={() => {
          setContentModalVisible(false);
          setSelectedContent(null);
        }}
      />
    </SafeAreaView>
  );
}

const getStyles = (theme: any, fontSizes: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: fontSizes.h1,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: fontSizes.medium,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.primary,
  },
  tabText: {
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  activeTabText: {
    color: theme.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});
