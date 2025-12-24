import { supabase } from './client';
import { showError } from '@/utils/toast';

/**
 * Uploads a file to a specified Supabase Storage bucket.
 * @param bucketName The name of the Supabase Storage bucket (e.g., 'avatars', 'project-thumbnails').
 * @param file The File object to upload.
 * @param path The path within the bucket where the file should be stored (e.g., 'user-id/avatar.png').
 * @returns The public URL of the uploaded file, or null if an error occurred.
 */
export const uploadFileToSupabase = async (
  bucketName: string,
  file: File,
  path: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true, // Overwrite if file with same path exists
      });

    if (error) {
      console.error(`Error uploading file to ${bucketName}/${path}:`, error);
      showError(`Failed to upload image: ${error.message}`);
      return null;
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);

    if (publicUrlData?.publicUrl) {
      return publicUrlData.publicUrl;
    } else {
      console.error("Failed to get public URL after upload.");
      showError("Failed to get public URL for the uploaded image.");
      return null;
    }
  } catch (err) {
    console.error("Unexpected error during file upload:", err);
    showError("An unexpected error occurred during image upload.");
    return null;
  }
};

/**
 * Deletes a file from a specified Supabase Storage bucket.
 * @param bucketName The name of the Supabase Storage bucket.
 * @param path The path within the bucket where the file is stored.
 * @returns True if deletion was successful, false otherwise.
 */
export const deleteFileFromSupabase = async (
  bucketName: string,
  path: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path]);

    if (error) {
      console.error(`Error deleting file from ${bucketName}/${path}:`, error);
      showError(`Failed to delete image: ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Unexpected error during file deletion:", err);
    showError("An unexpected error occurred during image deletion.");
    return false;
  }
};