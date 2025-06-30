// File: src/utils/cloudinaryUpload.js

/**
 * Upload a file to Cloudinary
 * @param {File} file - The file to upload
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - The Cloudinary response
 */
export const uploadToCloudinary = async (file, options = {}) => {
  try {
    const formData = new FormData();
    
    // Add the file
    formData.append('file', file);
    
    // Add upload preset
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    
    // Add optional parameters
    if (options.folder) {
      formData.append('folder', options.folder);
    }
    
    if (options.resource_type) {
      formData.append('resource_type', options.resource_type);
    } else {
      // Auto-detect resource type based on file type
      if (file.type.startsWith('video/')) {
        formData.append('resource_type', 'video');
      } else if (file.type.startsWith('image/')) {
        formData.append('resource_type', 'image');
      } else {
        formData.append('resource_type', 'auto');
      }
    }

    // Upload to Cloudinary
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Upload multiple files to Cloudinary
 * @param {FileList|Array} files - The files to upload
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} - Array of upload results
 */
export const uploadMultipleToCloudinary = async (files, options = {}) => {
  const uploadPromises = Array.from(files).map(file => 
    uploadToCloudinary(file, options));
  
  return Promise.all(uploadPromises);
};