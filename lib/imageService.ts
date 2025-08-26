import { supabase } from './supabase';

export interface ImageUploadResult {
  data: {
    publicUrl: string;
    path: string;
  } | null;
  error: Error | null;
}

export const imageService = {
  /**
   * Upload image to Supabase storage and return public URL
   */
  async uploadProfilePicture(
    imageUri: string, 
    userId: string, 
    fileName?: string
  ): Promise<ImageUploadResult> {
    try {
      console.log('📸 IMAGE SERVICE - Starting upload for user:', userId);
      console.log('📸 IMAGE SERVICE - Image URI:', imageUri);

      // Create a unique filename
      const timestamp = Date.now();
      const extension = imageUri.split('.').pop() || 'jpg';
      const uniqueFileName = fileName || `profile-${userId}-${timestamp}.${extension}`;
      const filePath = `profiles/${userId}/${uniqueFileName}`;

      console.log('📸 IMAGE SERVICE - Upload path:', filePath);

      // Fetch the image data
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const imageBlob = await response.blob();
      console.log('📸 IMAGE SERVICE - Image blob size:', imageBlob.size);

      // Convert blob to ArrayBuffer for upload
      const arrayBuffer = await new Response(imageBlob).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, uint8Array, {
          contentType: imageBlob.type || 'image/jpeg',
          upsert: true, // Replace if exists
        });

      if (uploadError) {
        console.error('📸 IMAGE SERVICE - Upload error:', uploadError);
        throw uploadError;
      }

      console.log('📸 IMAGE SERVICE - Upload successful:', uploadData.path);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(uploadData.path);

      console.log('📸 IMAGE SERVICE - Public URL:', urlData.publicUrl);

      return {
        data: {
          publicUrl: urlData.publicUrl,
          path: uploadData.path,
        },
        error: null,
      };
    } catch (error) {
      console.error('📸 IMAGE SERVICE - Error:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown upload error'),
      };
    }
  },

  /**
   * Delete profile picture from storage
   */
  async deleteProfilePicture(filePath: string): Promise<{ error: Error | null }> {
    try {
      console.log('📸 IMAGE SERVICE - Deleting file:', filePath);

      const { error } = await supabase.storage
        .from('profile-pictures')
        .remove([filePath]);

      if (error) {
        console.error('📸 IMAGE SERVICE - Delete error:', error);
        return { error };
      }

      console.log('📸 IMAGE SERVICE - Delete successful');
      return { error: null };
    } catch (error) {
      console.error('📸 IMAGE SERVICE - Delete error:', error);
      return {
        error: error instanceof Error ? error : new Error('Unknown delete error'),
      };
    }
  },

  /**
   * Generate a fallback avatar URL (for when storage is not available)
   */
  generateFallbackAvatar(name: string, color?: string): string {
    const timestamp = Date.now();
    const colors = ['4CAF50', 'FF9800', 'F44336', '9C27B0', '2196F3', 'FF5722', '795548', '607D8B'];
    const randomColor = color || colors[Math.floor(Math.random() * colors.length)];
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=${randomColor}&color=ffffff&format=png&t=${timestamp}`;
  },
};
