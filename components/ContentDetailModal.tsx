import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Content, contentService } from '@/lib/contentService';

interface ContentDetailModalProps {
  visible: boolean;
  content: Content | null;
  onClose: () => void;
}

export const ContentDetailModal: React.FC<ContentDetailModalProps> = ({
  visible,
  content,
  onClose
}) => {
  const [liked, setLiked] = useState(false);

  if (!content) return null;

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

  const handleLike = async () => {
    try {
      await contentService.trackInteraction(content.id, 'like');
      setLiked(true);
    } catch (error) {
      console.error('Error liking content:', error);
    }
  };

  const handleShare = async () => {
    try {
      await contentService.trackInteraction(content.id, 'share');
      
      const shareContent = {
        title: content.title,
        message: `${content.title}\n\n${content.excerpt || content.content.substring(0, 100)}...`,
      };
      
      await Share.share(shareContent);
    } catch (error) {
      console.error('Error sharing content:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient 
          colors={[getTypeColor(content.type), '#764ba2']} 
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <View style={styles.typeIndicator}>
                <Ionicons name={getTypeIcon(content.type) as any} size={16} color="white" />
                <Text style={styles.typeText}>
                  {content.type.charAt(0).toUpperCase() + content.type.slice(1)}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                <Ionicons name="share-outline" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <Text style={styles.title}>{content.title}</Text>

          {/* Meta information */}
          <View style={styles.metaInfo}>
            <View style={styles.authorInfo}>
              <Ionicons name="person-circle" size={20} color="#666" />
              <Text style={styles.authorText}>
                {content.author_name}
                {content.author_role && ` • ${content.author_role}`}
              </Text>
            </View>
            <Text style={styles.dateText}>
              {formatDate(content.published_at || content.created_at)}
            </Text>
          </View>

          {/* Priority badge */}
          {content.priority !== 'normal' && (
            <View style={[styles.priorityBadge, { backgroundColor: getTypeColor(content.type) }]}>
              <Ionicons name="warning" size={16} color="white" />
              <Text style={styles.priorityText}>
                {content.priority.toUpperCase()} PRIORITY
              </Text>
            </View>
          )}

          {/* Event details */}
          {content.type === 'event' && (
            <View style={styles.eventCard}>
              <Text style={styles.eventCardTitle}>📅 Event Details</Text>
              
              {content.event_date && (
                <View style={styles.eventDetail}>
                  <Ionicons name="calendar" size={18} color="#e74c3c" />
                  <View>
                    <Text style={styles.eventDetailTitle}>Date & Time</Text>
                    <Text style={styles.eventDetailText}>
                      {formatEventDate(content.event_date)}
                    </Text>
                    {content.event_end_date && (
                      <Text style={styles.eventDetailText}>
                        Until: {formatEventDate(content.event_end_date)}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {content.event_location && (
                <View style={styles.eventDetail}>
                  <Ionicons name="location" size={18} color="#e74c3c" />
                  <View>
                    <Text style={styles.eventDetailTitle}>Location</Text>
                    <Text style={styles.eventDetailText}>{content.event_location}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Image */}
          {content.image_url && (
            <Image source={{ uri: content.image_url }} style={styles.contentImage} />
          )}

          {/* Main content */}
          <View style={styles.contentBody}>
            <Text style={styles.contentText}>{content.content}</Text>
          </View>

          {/* Tags */}
          {content.tags && content.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.tagsTitle}>Tags</Text>
              <View style={styles.tags}>
                {content.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Attachment */}
          {content.attachment_url && (
            <TouchableOpacity 
              style={styles.attachmentButton}
              onPress={() => Linking.openURL(content.attachment_url!)}
            >
              <Ionicons name="document-attach" size={20} color="#667eea" />
              <Text style={styles.attachmentText}>View Attachment</Text>
              <Ionicons name="open-outline" size={16} color="#667eea" />
            </TouchableOpacity>
          )}

          {/* Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Action bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity 
            style={[styles.likeButton, liked && styles.likeButtonActive]}
            onPress={handleLike}
            disabled={liked}
          >
            <Ionicons 
              name={liked ? "heart" : "heart-outline"} 
              size={20} 
              color={liked ? "#e74c3c" : "#666"} 
            />
            <Text style={[styles.likeText, liked && styles.likeTextActive]}>
              {liked ? 'Liked' : 'Like'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social" size={20} color="#667eea" />
            <Text style={styles.shareText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    lineHeight: 36,
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  eventCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  eventCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  eventDetailTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contentImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  contentBody: {
    marginBottom: 20,
  },
  contentText: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 24,
  },
  tagsSection: {
    marginBottom: 20,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  attachmentText: {
    flex: 1,
    fontSize: 16,
    color: '#667eea',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 20,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  likeButtonActive: {
    backgroundColor: '#fff0f0',
  },
  likeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  likeTextActive: {
    color: '#e74c3c',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
  },
  shareText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#667eea',
  },
});
