// src/utils/imageUtils.ts

/**
 * Converts a File object (e.g., an image) to a Base64 encoded string.
 * This is useful for displaying image previews without relying on blob URLs,
 * which can sometimes lead to ERR_FILE_NOT_FOUND if revoked prematurely.
 * @param file The File object to convert.
 * @returns A Promise that resolves with the Base64 string, or rejects on error.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};