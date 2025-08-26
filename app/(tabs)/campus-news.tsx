import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ContentFeed } from '@/components/ContentFeed';
import { ContentDetailModal } from '@/components/ContentDetailModal';
import { Content } from '@/lib/contentService';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import { supabase } from '@/lib/supabase';

export default function CampusNewsScreen() {
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [contentModalVisible, setContentModalVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Theme and font contexts
  const { isDark, theme } = useTheme();
  const { fontSizes } = useFontSize();

  useEffect(() => {
    console.log('📰 CAMPUS NEWS - Component mounted/rendered');
    
    // Check authentication status
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  console.log('📰 CAMPUS NEWS - Render called');

  const handleContentPress = (content: Content) => {
    setSelectedContent(content);
    setContentModalVisible(true);
  };

  const styles = getStyles(theme, fontSizes, isDark);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Ionicons name="newspaper" size={28} color="white" style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Campus News</Text>
          </View>
          {!isAuthenticated && (
            <View style={styles.visitorBadge}>
              <Ionicons name="eye" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.visitorBadgeText}>Visitor</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerSubtitle}>
          {isAuthenticated 
            ? "Stay informed with campus announcements and news"
            : "Discover what's happening on campus - public announcements and events"
          }
        </Text>
      </LinearGradient>

      {/* Content Feed */}
      <View style={styles.content}>
        <ContentFeed onContentPress={handleContentPress} />
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
    backgroundColor: theme.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: fontSizes.large,
    fontWeight: 'bold',
    color: 'white',
  },
  visitorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  visitorBadgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: fontSizes.small,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerSubtitle: {
    fontSize: fontSizes.medium,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  content: {
    flex: 1,
    backgroundColor: theme.background,
  },
});
