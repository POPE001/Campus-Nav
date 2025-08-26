import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { contentService, Content } from '@/lib/contentService';

interface ContentFeedProps {
  onContentPress?: (content: Content) => void;
  limit?: number;
}

export const ContentFeed: React.FC<ContentFeedProps> = ({ 
  onContentPress, 
  limit = 20 
}) => {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadContent();
  }, [filter]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const { data, error } = await contentService.getContent({
        type: filter,
        limit,
      });

      if (error) {
        console.error('Error loading content:', error);
        Alert.alert('Error', 'Failed to load content');
        return;
      }

      setContent(data || []);
    } catch (error) {
      console.error('Exception loading content:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  };

  const handleContentPress = async (item: Content) => {
    if (onContentPress) {
      onContentPress(item);
    } else {
      // Default behavior - track interaction
      await contentService.trackInteraction(item.id, 'view');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'event': return 'calendar';
      case 'announcement': return 'megaphone';
      case 'blog': return 'book';
      default: return 'newspaper';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'event': return '#e74c3c';
      case 'announcement': return '#f39c12';
      case 'blog': return '#9b59b6';
      default: return '#3498db';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#e74c3c';
      case 'high': return '#f39c12';
      case 'normal': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) {
      return 'Just now';
    } else if (hours < 24) {
      return `${Math.floor(hours)}h ago`;
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderContentCard = (item: Content) => (
    <TouchableOpacity
      key={item.id}
      style={styles.contentCard}
      onPress={() => handleContentPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.contentHeader}>
        <View style={styles.contentMeta}>
          <View style={[styles.typeIcon, { backgroundColor: getTypeColor(item.type) }]}>
            <Ionicons name={getTypeIcon(item.type) as any} size={12} color="white" />
          </View>
          <Text style={styles.typeText}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
          {item.priority !== 'normal' && (
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
              <Text style={styles.priorityText}>
                {item.priority.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.timeText}>{formatDate(item.published_at || item.created_at)}</Text>
      </View>

      <Text style={styles.contentTitle} numberOfLines={2}>{item.title}</Text>
      
      {item.excerpt && (
        <Text style={styles.contentExcerpt} numberOfLines={3}>
          {item.excerpt}
        </Text>
      )}

      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.contentImage} />
      )}

      {item.type === 'event' && item.event_date && (
        <View style={styles.eventDetails}>
          <Ionicons name="calendar-outline" size={14} color="#666" />
          <Text style={styles.eventDate}>
            {new Date(item.event_date).toLocaleDateString()} 
            {item.event_location && ` • ${item.event_location}`}
          </Text>
        </View>
      )}

      <View style={styles.contentFooter}>
        <View style={styles.authorInfo}>
          <Ionicons name="person-circle-outline" size={16} color="#666" />
          <Text style={styles.authorText}>
            {item.author_name} {item.author_role && `• ${item.author_role}`}
          </Text>
        </View>
        
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tags}>
            {item.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
            {item.tags.length > 2 && (
              <Text style={styles.moreTagsText}>+{item.tags.length - 2}</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading content...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterButton, !filter && styles.filterButtonActive]}
          onPress={() => setFilter(undefined)}
        >
          <Text style={[styles.filterButtonText, !filter && styles.filterButtonTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        
        {['announcement', 'article', 'blog', 'event'].map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.filterButton, filter === type && styles.filterButtonActive]}
            onPress={() => setFilter(type)}
          >
            <Ionicons name={getTypeIcon(type) as any} size={16} color={filter === type ? 'white' : '#666'} />
            <Text style={[styles.filterButtonText, filter === type && styles.filterButtonTextActive]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}s
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content feed */}
      <ScrollView
        style={styles.contentList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {content.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No content available</Text>
            <Text style={styles.emptySubtext}>
              Check back later for updates from staff
            </Text>
          </View>
        ) : (
          content.map(renderContentCard)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    maxHeight: 50,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  contentList: {
    flex: 1,
    padding: 16,
  },
  contentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    lineHeight: 24,
  },
  contentExcerpt: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  contentImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  contentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  authorText: {
    fontSize: 12,
    color: '#666',
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    color: '#666',
  },
  moreTagsText: {
    fontSize: 10,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
