import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetSizeKB?: number;
  format?: ImageManipulator.SaveFormat;
}

export interface OptimizedImageResult {
  uri: string;
  width: number;
  height: number;
  originalSizeKB: number;
  optimizedSizeKB: number;
  compressionRatio: number;
  thumbnails?: ProgressiveThumbnails;
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  targetSizeKB: 800, // Target 800KB for optimal balance
  format: ImageManipulator.SaveFormat.JPEG,
};

/**
 * Get file size in KB from URI
 */
const getFileSizeKB = async (uri: string): Promise<number> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists && 'size' in fileInfo) {
      return Math.round(fileInfo.size / 1024);
    }
    return 0;
  } catch (error) {
    console.warn('Error getting file size:', error);
    return 0;
  }
};

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
const calculateOptimalDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const aspectRatio = originalWidth / originalHeight;
  
  let newWidth = originalWidth;
  let newHeight = originalHeight;
  
  // Scale down if larger than max dimensions
  if (originalWidth > maxWidth || originalHeight > maxHeight) {
    if (aspectRatio > 1) {
      // Landscape
      newWidth = Math.min(maxWidth, originalWidth);
      newHeight = Math.round(newWidth / aspectRatio);
    } else {
      // Portrait or square
      newHeight = Math.min(maxHeight, originalHeight);
      newWidth = Math.round(newHeight * aspectRatio);
    }
  }
  
  return { width: newWidth, height: newHeight };
};

/**
 * Optimize image with progressive quality reduction if needed
 */
export const optimizeImageForOCR = async (
  imageUri: string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  console.log('🖼️ Starting image optimization for OCR...');
  
  try {
    // Get original file size
    const originalSizeKB = await getFileSizeKB(imageUri);
    console.log(`📊 Original image size: ${originalSizeKB}KB`);
    
    // Get image info to determine dimensions
    const imageInfo = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG }
    );
    
    const { width: originalWidth, height: originalHeight } = imageInfo;
    console.log(`📐 Original dimensions: ${originalWidth}x${originalHeight}`);
    
    // Calculate optimal dimensions
    const { width: targetWidth, height: targetHeight } = calculateOptimalDimensions(
      originalWidth,
      originalHeight,
      opts.maxWidth,
      opts.maxHeight
    );
    
    console.log(`🎯 Target dimensions: ${targetWidth}x${targetHeight}`);
    
    // Prepare manipulation actions
    const actions: ImageManipulator.Action[] = [];
    
    // Resize if dimensions changed
    if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
      actions.push({
        resize: {
          width: targetWidth,
          height: targetHeight,
        },
      });
    }
    
    // Start with initial quality
    let currentQuality = opts.quality;
    let optimizedResult: ImageManipulator.ImageResult;
    let attempts = 0;
    const maxAttempts = 5;
    
    do {
      attempts++;
      console.log(`🔄 Optimization attempt ${attempts} with quality ${currentQuality}`);
      
      optimizedResult = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        {
          compress: currentQuality,
          format: opts.format,
        }
      );
      
      const currentSizeKB = await getFileSizeKB(optimizedResult.uri);
      console.log(`📏 Current size: ${currentSizeKB}KB (target: ${opts.targetSizeKB}KB)`);
      
      // If size is acceptable or we've tried enough times, break
      if (currentSizeKB <= opts.targetSizeKB || attempts >= maxAttempts) {
        break;
      }
      
      // Reduce quality for next attempt
      currentQuality = Math.max(0.3, currentQuality - 0.15);
      
    } while (attempts < maxAttempts);
    
    const finalSizeKB = await getFileSizeKB(optimizedResult.uri);
    const compressionRatio = originalSizeKB > 0 ? finalSizeKB / originalSizeKB : 1;
    
    console.log(`✅ Image optimization complete:`);
    console.log(`   Original: ${originalSizeKB}KB (${originalWidth}x${originalHeight})`);
    console.log(`   Optimized: ${finalSizeKB}KB (${optimizedResult.width}x${optimizedResult.height})`);
    console.log(`   Compression ratio: ${(compressionRatio * 100).toFixed(1)}%`);
    console.log(`   Final quality: ${currentQuality}`);
    
    return {
      uri: optimizedResult.uri,
      width: optimizedResult.width,
      height: optimizedResult.height,
      originalSizeKB,
      optimizedSizeKB: finalSizeKB,
      compressionRatio,
    };
    
  } catch (error) {
    console.error('❌ Error optimizing image:', error);
    // Return original image info as fallback
    const originalSizeKB = await getFileSizeKB(imageUri);
    return {
      uri: imageUri,
      width: 0,
      height: 0,
      originalSizeKB,
      optimizedSizeKB: originalSizeKB,
      compressionRatio: 1,
    };
  }
};

/**
 * Quick optimization for document scanning
 * Optimized specifically for OCR with higher contrast and sharpness
 */
export const optimizeDocumentImage = async (
  imageUri: string
): Promise<OptimizedImageResult> => {
  return optimizeImageForOCR(imageUri, {
    maxWidth: 1600, // Good balance for document text
    maxHeight: 1600,
    quality: 0.85, // Higher quality for text clarity
    targetSizeKB: 600, // Smaller target for faster upload
    format: ImageManipulator.SaveFormat.JPEG,
  });
};

/**
 * Create progressive thumbnails for fast loading
 */
export interface ThumbnailResult {
  uri: string;
  width: number;
  height: number;
  sizeKB: number;
}

export interface ProgressiveThumbnails {
  lowRes: ThumbnailResult;
  mediumRes: ThumbnailResult;
  highRes?: ThumbnailResult;
}

export const createProgressiveThumbnails = async (
  imageUri: string
): Promise<ProgressiveThumbnails> => {
  console.log('🖼️ Creating progressive thumbnails for:', imageUri);
  const startTime = Date.now();
  
  try {
    // Create low-res thumbnail (80x80, very fast loading)
    const lowResResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 80, height: 80 } }],
      {
        compress: 0.4,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    
    // Create medium-res thumbnail (200x200, for list view)
    const mediumResResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 200, height: 200 } }],
      {
        compress: 0.6,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    
    // Create high-res thumbnail (400x400, for detail view)
    const highResResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 400, height: 400 } }],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    
    const [lowResSizeKB, mediumResSizeKB, highResSizeKB] = await Promise.all([
      getFileSizeKB(lowResResult.uri),
      getFileSizeKB(mediumResResult.uri),
      getFileSizeKB(highResResult.uri),
    ]);
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Progressive thumbnails created in ${processingTime}ms`);
    console.log(`   Low-res: ${lowResSizeKB}KB (${lowResResult.width}x${lowResResult.height})`);
    console.log(`   Medium-res: ${mediumResSizeKB}KB (${mediumResResult.width}x${mediumResResult.height})`);
    console.log(`   High-res: ${highResSizeKB}KB (${highResResult.width}x${highResResult.height})`);
    
    return {
      lowRes: {
        uri: lowResResult.uri,
        width: lowResResult.width,
        height: lowResResult.height,
        sizeKB: lowResSizeKB,
      },
      mediumRes: {
        uri: mediumResResult.uri,
        width: mediumResResult.width,
        height: mediumResResult.height,
        sizeKB: mediumResSizeKB,
      },
      highRes: {
        uri: highResResult.uri,
        width: highResResult.width,
        height: highResResult.height,
        sizeKB: highResSizeKB,
      },
    };
  } catch (error) {
    console.error('❌ Error creating progressive thumbnails:', error);
    // Return fallback with original image
    const fallbackSize = await getFileSizeKB(imageUri);
    const fallback: ThumbnailResult = {
      uri: imageUri,
      width: 200,
      height: 200,
      sizeKB: fallbackSize,
    };
    return {
      lowRes: fallback,
      mediumRes: fallback,
      highRes: fallback,
    };
  }
};

/**
 * Create a single thumbnail with specified dimensions
 */
export const createThumbnail = async (
  imageUri: string,
  width: number = 200,
  height: number = 200,
  quality: number = 0.6
): Promise<ThumbnailResult> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width, height } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    
    const sizeKB = await getFileSizeKB(result.uri);
    
    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      sizeKB,
    };
  } catch (error) {
    console.error('❌ Error creating thumbnail:', error);
    const fallbackSize = await getFileSizeKB(imageUri);
    return {
      uri: imageUri,
      width,
      height,
      sizeKB: fallbackSize,
    };
  }
};

/**
 * Batch create thumbnails for multiple images
 */
export const createBatchThumbnails = async (
  imageUris: string[],
  width: number = 200,
  height: number = 200,
  onProgress?: (current: number, total: number) => void
): Promise<ThumbnailResult[]> => {
  console.log(`🔄 Creating ${imageUris.length} thumbnails...`);
  const startTime = Date.now();
  
  const results: ThumbnailResult[] = [];
  const batchSize = 3; // Process in small batches to avoid memory issues
  
  for (let i = 0; i < imageUris.length; i += batchSize) {
    const batch = imageUris.slice(i, i + batchSize);
    const batchPromises = batch.map(uri => createThumbnail(uri, width, height));
    const batchResults = await Promise.all(batchPromises);
    
    results.push(...batchResults);
    onProgress?.(Math.min(i + batchSize, imageUris.length), imageUris.length);
    
    // Small delay between batches
    if (i + batchSize < imageUris.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`✅ Batch thumbnail creation completed in ${totalTime}ms`);
  
  return results;
};

/**
 * Batch optimize multiple images
 */
export const optimizeMultipleImages = async (
  imageUris: string[],
  options?: ImageOptimizationOptions,
  onProgress?: (current: number, total: number) => void
): Promise<OptimizedImageResult[]> => {
  const results: OptimizedImageResult[] = [];
  
  for (let i = 0; i < imageUris.length; i++) {
    onProgress?.(i + 1, imageUris.length);
    const result = await optimizeImageForOCR(imageUris[i], options);
    results.push(result);
  }
  
  return results;
};