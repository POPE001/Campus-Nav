import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'class' | 'assignment' | 'announcement' | 'reminder' | 'system';
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  authorRole: string;
  timestamp: Date;
  category: 'academic' | 'campus-life' | 'events' | 'announcement' | 'news';
  imageUrl?: string;
  tags: string[];
  readTime: number; // in minutes
}

const NotificationsScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'updates'>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Upcoming Class',
      message: 'CSC 301 - Data Structures starts in 30 minutes at Science Building LT1',
      type: 'class',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      read: false,
      priority: 'high'
    },
    {
      id: '2',
      title: 'Assignment Due Soon',
      message: 'Software Engineering Project is due tomorrow at 11:59 PM',
      type: 'assignment',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
      priority: 'high'
    },
    {
      id: '3',
      title: 'Campus Announcement',
      message: 'Library will be closed for maintenance this weekend',
      type: 'announcement',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      read: true,
      priority: 'medium'
    },
    {
      id: '4',
      title: 'Schedule Reminder',
      message: 'You have 3 classes scheduled for tomorrow',
      type: 'reminder',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      read: true,
      priority: 'low'
    },
    {
      id: '5',
      title: 'Exam Schedule',
      message: 'Mid-semester exams begin next week. Check your timetable.',
      type: 'announcement',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      read: true,
      priority: 'medium'
    }
  ]);

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([
    {
      id: '1',
      title: 'New Research Facility Opens at OAU',
      content: `The Obafemi Awolowo University is proud to announce the opening of our new state-of-the-art research facility. This facility will house advanced laboratories for engineering, computer science, and biotechnology research.

The facility includes:
- 10 modern research laboratories
- High-performance computing cluster
- Collaborative workspaces
- Conference rooms with video conferencing capabilities

This investment in infrastructure demonstrates OAU's commitment to excellence in research and innovation. Students and faculty will have access to cutting-edge equipment and resources to pursue groundbreaking research projects.

The facility will officially open to students and researchers next month. We encourage all students to explore the opportunities this new facility provides for their academic and research pursuits.`,
      excerpt: 'The Obafemi Awolowo University announces the opening of a new state-of-the-art research facility with advanced laboratories and computing resources.',
      author: 'Prof. Adebayo Johnson',
      authorRole: 'Vice-Chancellor',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      category: 'academic',
      tags: ['research', 'facility', 'laboratories', 'innovation'],
      readTime: 3
    },
    {
      id: '2',
      title: 'Student Innovation Week 2024',
      content: `Get ready for the most exciting week of the academic year! Student Innovation Week 2024 is coming from March 15-22, featuring competitions, workshops, and networking opportunities.

Event Highlights:
- Startup pitch competition with ₦500,000 in prizes
- Technology workshops on AI, blockchain, and IoT
- Industry networking sessions
- Innovation showcase and exhibition

This year's theme is "Building Tomorrow's Solutions Today" and we encourage students from all faculties to participate. Whether you're interested in technology, business, or social innovation, there's something for everyone.

Registration is now open on the student portal. Early bird registration (before March 1st) includes a free innovation toolkit and priority access to workshops.

Don't miss this opportunity to showcase your ideas, learn from industry experts, and connect with like-minded innovators!`,
      excerpt: 'Join us for Student Innovation Week 2024 featuring competitions, workshops, and networking opportunities with ₦500,000 in prizes.',
      author: 'Dr. Funmi Adeyemi',
      authorRole: 'Director, Innovation Hub',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      category: 'events',
      tags: ['innovation', 'competition', 'workshops', 'networking'],
      readTime: 4
    },
    {
      id: '3',
      title: 'New Online Learning Platform Launch',
      content: `We are excited to announce the launch of OAU Connect, our new comprehensive online learning platform designed to enhance your educational experience.

Platform Features:
- Interactive video lectures with offline download
- Real-time collaboration tools for group projects
- Integrated assignment submission and grading
- Discussion forums for each course
- Mobile app for learning on the go

All current courses will be migrated to the new platform over the next two weeks. Students will receive login credentials via their university email.

Training sessions for the platform will be held in the library computer lab:
- February 20th, 2:00 PM - 4:00 PM
- February 22nd, 10:00 AM - 12:00 PM
- February 24th, 3:00 PM - 5:00 PM

Technical support is available 24/7 through the help desk. We're committed to making this transition as smooth as possible for all students.`,
      excerpt: 'Introducing OAU Connect, our new online learning platform with interactive features and mobile accessibility.',
      author: 'IT Support Team',
      authorRole: 'Information Technology Unit',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
      category: 'academic',
      tags: ['e-learning', 'technology', 'platform', 'education'],
      readTime: 3
    },
    {
      id: '4',
      title: 'Campus Safety and Security Updates',
      content: `Your safety is our top priority. We want to update you on recent security enhancements and remind you of important safety protocols.

Recent Security Improvements:
- Additional security cameras installed across campus
- Extended security patrol hours (now 24/7)
- New emergency alert system via SMS
- Improved lighting in parking areas and walkways

Safety Reminders:
- Always carry your student ID card
- Report suspicious activities to security immediately
- Use well-lit pathways, especially at night
- Keep personal belongings secure in dormitories
- Emergency contact: 08123456789

We've also established a new campus safety committee with student representatives. If you're interested in joining or have safety concerns to discuss, please contact the Student Affairs office.

Remember, campus safety is a shared responsibility. Stay alert, look out for one another, and don't hesitate to report any concerns.`,
      excerpt: 'Important updates on campus security enhancements and safety protocols for all students.',
      author: 'Chief Security Officer',
      authorRole: 'Campus Security',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      category: 'announcement',
      tags: ['safety', 'security', 'emergency', 'campus'],
      readTime: 2
    },
    {
      id: '5',
      title: 'Cultural Festival 2024 - Call for Participants',
      content: `OAU Cultural Festival 2024 is around the corner! This annual celebration of our diverse heritage will take place on April 10-12, 2024.

We're calling for student participation in:

Performance Categories:
- Traditional dance competitions
- Music performances (solo and group)
- Drama and theatrical presentations
- Poetry recitation
- Fashion shows featuring cultural attire

Cultural Exhibitions:
- Art and craft displays
- Traditional food stalls
- Cultural heritage booths
- Photography exhibitions

Prizes and Recognition:
- Cash prizes for winning performances
- Certificates for all participants
- Special recognition for innovative cultural presentations
- Opportunity to represent OAU at national festivals

Registration deadline: March 15, 2024
Registration fee: ₦1,000 per individual, ₦3,000 per group

This is your chance to showcase your cultural heritage, learn about others, and celebrate the rich diversity that makes OAU special. Register now at the Student Activities Center!`,
      excerpt: 'Join OAU Cultural Festival 2024! Register now for performances, exhibitions, and competitions celebrating our diverse heritage.',
      author: 'Mrs. Blessing Okafor',
      authorRole: 'Director, Student Activities',
      timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000),
      category: 'campus-life',
      tags: ['culture', 'festival', 'performance', 'diversity'],
      readTime: 4
    }
  ]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate fetching new notifications
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'class':
        return 'school';
      case 'assignment':
        return 'document-text';
      case 'announcement':
        return 'megaphone';
      case 'reminder':
        return 'alarm';
      case 'system':
        return 'settings';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: Notification['type'], priority: Notification['priority']) => {
    if (priority === 'high') return '#ff4757';
    
    switch (type) {
      case 'class':
        return '#667eea';
      case 'assignment':
        return '#ffa502';
      case 'announcement':
        return '#2ed573';
      case 'reminder':
        return '#70a1ff';
      case 'system':
        return '#5f27cd';
      default:
        return '#747d8c';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getCategoryColor = (category: BlogPost['category']) => {
    switch (category) {
      case 'academic':
        return '#667eea';
      case 'campus-life':
        return '#2ed573';
      case 'events':
        return '#ffa502';
      case 'announcement':
        return '#ff4757';
      case 'news':
        return '#70a1ff';
      default:
        return '#747d8c';
    }
  };

  const getCategoryIcon = (category: BlogPost['category']) => {
    switch (category) {
      case 'academic':
        return 'school';
      case 'campus-life':
        return 'people';
      case 'events':
        return 'calendar';
      case 'announcement':
        return 'megaphone';
      case 'news':
        return 'newspaper';
      default:
        return 'document-text';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Updates</Text>
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'notifications' && styles.tabButtonActive]}
            onPress={() => setActiveTab('notifications')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'notifications' && styles.tabButtonTextActive]}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'updates' && styles.tabButtonActive]}
            onPress={() => setActiveTab('updates')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'updates' && styles.tabButtonTextActive]}>
              Updates
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'notifications' && notifications.length > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <Ionicons name="checkmark-done" size={16} color={unreadCount === 0 ? '#ccc' : '#667eea'} />
            <Text style={[styles.actionButtonText, unreadCount === 0 && styles.actionButtonDisabled]}>
              Mark All Read
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={clearAllNotifications}
          >
            <Ionicons name="trash-outline" size={16} color="#ff4757" />
            <Text style={[styles.actionButtonText, { color: '#ff4757' }]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.notificationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'notifications' ? (
          notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No Notifications</Text>
              <Text style={styles.emptyStateMessage}>
                You're all caught up! New notifications will appear here.
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.read && styles.notificationCardUnread
              ]}
              onPress={() => markAsRead(notification.id)}
              activeOpacity={0.7}
            >
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <View style={[
                    styles.notificationIcon,
                    { backgroundColor: getNotificationColor(notification.type, notification.priority) + '20' }
                  ]}>
                    <Ionicons 
                      name={getNotificationIcon(notification.type)} 
                      size={20} 
                      color={getNotificationColor(notification.type, notification.priority)} 
                    />
                  </View>
                  
                  <View style={styles.notificationInfo}>
                    <View style={styles.titleRow}>
                      <Text style={[
                        styles.notificationTitle,
                        !notification.read && styles.notificationTitleUnread
                      ]}>
                        {notification.title}
                      </Text>
                      {!notification.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notificationTimestamp}>
                      {formatTimestamp(notification.timestamp)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteNotification(notification.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={18} color="#999" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>

                {notification.priority === 'high' && (
                  <View style={styles.priorityBadge}>
                    <Ionicons name="warning" size={12} color="white" />
                    <Text style={styles.priorityText}>Priority</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            ))
          )
        ) : (
          // Blog Posts / Updates Tab
          blogPosts.map((post) => (
            <View key={post.id} style={styles.blogCard}>
              <View style={styles.blogHeader}>
                <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(post.category) + '20' }]}>
                  <Ionicons 
                    name={getCategoryIcon(post.category)} 
                    size={14} 
                    color={getCategoryColor(post.category)} 
                  />
                  <Text style={[styles.categoryText, { color: getCategoryColor(post.category) }]}>
                    {post.category.charAt(0).toUpperCase() + post.category.slice(1).replace('-', ' ')}
                  </Text>
                </View>
                <Text style={styles.readTime}>{post.readTime} min read</Text>
              </View>
              
              <Text style={styles.blogTitle}>{post.title}</Text>
              <Text style={styles.blogExcerpt}>{post.excerpt}</Text>
              
              <View style={styles.blogFooter}>
                <View style={styles.authorInfo}>
                  <View style={styles.authorAvatar}>
                    <Ionicons name="person" size={16} color="#667eea" />
                  </View>
                  <View style={styles.authorDetails}>
                    <Text style={styles.authorName}>{post.author}</Text>
                    <Text style={styles.authorRole}>{post.authorRole}</Text>
                  </View>
                </View>
                <Text style={styles.blogTimestamp}>{formatTimestamp(post.timestamp)}</Text>
              </View>
              
              <View style={styles.tagsContainer}>
                {post.tags.slice(0, 3).map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
                {post.tags.length > 3 && (
                  <Text style={styles.moreTagsText}>+{post.tags.length - 3} more</Text>
                )}
              </View>
            </View>
          ))
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  unreadBadge: {
    backgroundColor: '#ff4757',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  actionButtonDisabled: {
    color: '#ccc',
  },
  notificationsList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6c757d',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
  notificationCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    flex: 1,
  },
  notificationTitleUnread: {
    color: '#212529',
    fontWeight: 'bold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#667eea',
    marginLeft: 8,
  },
  notificationTimestamp: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
    marginBottom: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4757',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 2,
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#667eea',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  tabButtonTextActive: {
    color: 'white',
  },
  tabBadge: {
    backgroundColor: '#ff4757',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  blogCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  blogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  readTime: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  blogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
    lineHeight: 24,
  },
  blogExcerpt: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
    marginBottom: 16,
  },
  blogFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  authorRole: {
    fontSize: 12,
    color: '#6c757d',
  },
  blogTimestamp: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 11,
    color: '#6c757d',
    fontStyle: 'italic',
  },
});

export default NotificationsScreen;
