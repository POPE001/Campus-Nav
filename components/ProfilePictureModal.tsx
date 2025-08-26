import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import { profileService, UserProfile } from '@/lib/profileService';
import { imageService } from '@/lib/imageService';
import Toast from 'react-native-toast-message';
import FullScreenImageViewer from './FullScreenImageViewer';

interface ProfilePictureModalProps {
  visible: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

export default function ProfilePictureModal({
  visible,
  onClose,
  profile,
  onProfileUpdate,
}: ProfilePictureModalProps) {
  const { theme } = useTheme();
  const { fontSizes } = useFontSize();
  const [isUploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showFullScreenViewer, setShowFullScreenViewer] = useState(false);

  const getAvatarInitials = () => {
    if (!profile) return 'U';
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photo library to update your profile picture.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const handleSelectFromLibrary = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Toast.show({
        type: 'error',
        text1: 'Image Selection Failed',
        text2: 'Failed to select image. Please try again.',
      });
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your camera to take a profile picture.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Toast.show({
        type: 'error',
        text1: 'Camera Error',
        text2: 'Failed to take photo. Please try again.',
      });
    }
  };

  const uploadProfilePicture = async (imageUri: string) => {
    if (!profile) {
      console.error('Profile picture upload failed: No profile data available');
      return;
    }
    
    console.log('📸 UPLOAD - Starting upload for selected image:', imageUri);
    setUploading(true);
    
    try {
      // Upload the actual selected image to Supabase storage
      console.log('📸 UPLOAD - Uploading to Supabase storage...');
      const { data: uploadResult, error: uploadError } = await imageService.uploadProfilePicture(
        imageUri,
        profile.id,
      );

      let finalImageUrl: string;

      if (uploadError || !uploadResult) {
        // Upload failed, fall back to generated avatar
        console.warn('📸 UPLOAD - Storage upload failed, using fallback avatar:', uploadError);
        finalImageUrl = imageService.generateFallbackAvatar(
          `${profile.first_name} ${profile.last_name}`
        );
        
        Toast.show({
          type: 'info',
          text1: 'Upload Notice',
          text2: 'Using generated avatar as fallback',
        });
      } else {
        // Upload successful, use the real image URL
        console.log('📸 UPLOAD - Storage upload successful!');
        finalImageUrl = uploadResult.publicUrl;
        
        Toast.show({
          type: 'success',
          text1: 'Photo Uploaded',
          text2: 'Your photo has been uploaded successfully',
        });
      }

      console.log('📸 UPLOAD - Final image URL:', finalImageUrl);

      // Update the profile with the image URL
      const { data: profileData, error: profileError } = await profileService.updateProfile({
        profile_picture_url: finalImageUrl,
      });

      if (profileError) {
        throw profileError;
      }

      if (profileData) {
        onProfileUpdate(profileData);
        onClose();
      }
    } catch (error) {
      console.error('📸 UPLOAD - Profile picture upload failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: 'Failed to update profile picture. Please try again.',
      });
    } finally {
      setUploading(false);
      setSelectedImage(null);
    }
  };

  const handleRemovePhoto = async () => {
    if (!profile) return;

    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploading(true);
            try {
              // If there's an existing image in storage, try to delete it
              if (profile.profile_picture_url?.includes('supabase.co/storage/')) {
                const pathMatch = profile.profile_picture_url.match(/profiles\/[^?]+/);
                if (pathMatch) {
                  console.log('📸 Deleting image from storage:', pathMatch[0]);
                  await imageService.deleteProfilePicture(pathMatch[0]);
                }
              }

              // Update profile to remove picture URL
              const { data, error } = await profileService.updateProfile({
                profile_picture_url: null,
              });

              if (error) {
                throw error;
              }

              if (data) {
                onProfileUpdate(data);
                Toast.show({
                  type: 'success',
                  text1: 'Profile Picture Removed',
                  text2: 'Your profile picture has been removed',
                });
                onClose();
              }
            } catch (error) {
              console.error('Error removing profile picture:', error);
              Toast.show({
                type: 'error',
                text1: 'Remove Failed',
                text2: 'Failed to remove profile picture. Please try again.',
              });
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  const handleViewFullSize = () => {
    if (profile?.profile_picture_url) {
      setShowFullScreenViewer(true);
    } else {
      Alert.alert('No Image', 'No profile picture to display');
    }
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          {/* Header */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.header}
          >
            <Text style={[styles.headerTitle, { fontSize: fontSizes.h3 }]}>
              Profile Picture
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Current Picture */}
          <View style={styles.currentPictureSection}>
            <View style={styles.pictureContainer}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.picture} />
              ) : profile?.profile_picture_url ? (
                <Image source={{ uri: profile.profile_picture_url }} style={styles.picture} />
              ) : (
                <View style={[styles.placeholderPicture, { backgroundColor: theme.primary }]}>
                  <Text style={styles.placeholderText}>{getAvatarInitials()}</Text>
                </View>
              )}
              {isUploading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#ffffff" />
                </View>
              )}
            </View>
            <Text style={[styles.currentPictureLabel, { color: theme.textSecondary, fontSize: fontSizes.medium }]}>
              Current Profile Picture
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={handleSelectFromLibrary}
              disabled={isUploading}
            >
              <Ionicons name="image" size={24} color="white" />
              <Text style={[styles.actionButtonText, { fontSize: fontSizes.medium }]}>
                Choose from Library
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={handleTakePhoto}
              disabled={isUploading}
            >
              <Ionicons name="camera" size={24} color="white" />
              <Text style={[styles.actionButtonText, { fontSize: fontSizes.medium }]}>
                Take Photo
              </Text>
            </TouchableOpacity>

            {profile?.profile_picture_url && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton, { borderColor: theme.border }]}
                  onPress={handleViewFullSize}
                  disabled={isUploading}
                >
                  <Ionicons name="expand" size={24} color={theme.text} />
                  <Text style={[styles.actionButtonText, { color: theme.text, fontSize: fontSizes.medium }]}>
                    View Full Size
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.dangerButton]}
                  onPress={handleRemovePhoto}
                  disabled={isUploading}
                >
                  <Ionicons name="trash" size={24} color="#ff4757" />
                  <Text style={[styles.actionButtonText, styles.dangerButtonText, { fontSize: fontSizes.medium }]}>
                    Remove Picture
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {isUploading && (
            <View style={styles.uploadingSection}>
              <Text style={[styles.uploadingText, { color: theme.textSecondary, fontSize: fontSizes.medium }]}>
                Updating profile picture...
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>

    {/* Full Screen Image Viewer */}
    <FullScreenImageViewer
      visible={showFullScreenViewer}
      onClose={() => setShowFullScreenViewer(false)}
      imageUri={profile?.profile_picture_url || ''}
      title={`${profile?.first_name || 'User'}'s Profile Picture`}
    />
  </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  currentPictureSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  pictureContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  picture: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholderPicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPictureLabel: {
    textAlign: 'center',
    fontWeight: '500',
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderWidth: 1,
    borderColor: '#ff4757',
  },
  actionButtonText: {
    fontWeight: '600',
    color: 'white',
  },
  dangerButtonText: {
    color: '#ff4757',
  },
  uploadingSection: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  uploadingText: {
    fontStyle: 'italic',
  },
});
