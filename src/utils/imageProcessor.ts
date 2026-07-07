import * as ImageManipulator from 'expo-image-manipulator';

export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Processes an image according to the Memecam.in specifications:
 * 1. Crops to the target aspect ratio
 * 2. Compresses/Resizes to 1024px width/height to keep high resolution
 */
export const processMemeImage = async (uri: string, targetAspectRatio: string = '1:1'): Promise<ProcessedImage> => {
  try {
    // First, let's get the original dimensions
    const result = await ImageManipulator.manipulateAsync(uri, [], { format: ImageManipulator.SaveFormat.JPEG });
    
    let targetRatio = 1;
    if (targetAspectRatio === '4:3') targetRatio = 3/4; // Portrait mode
    if (targetAspectRatio === '16:9') targetRatio = 9/16; // Portrait mode
    
    // Calculate crop dimensions to match the target ratio exactly
    const sourceRatio = result.width / result.height;
    
    let cropWidth = result.width;
    let cropHeight = result.height;
    
    if (sourceRatio > targetRatio) {
      // Source is wider than target: restrict width
      cropWidth = result.height * targetRatio;
    } else {
      // Source is taller than target: restrict height
      cropHeight = result.width / targetRatio;
    }
    
    const originX = (result.width - cropWidth) / 2;
    const originY = (result.height - cropHeight) / 2;

    // Calculate resize dimensions (max 1024 on the longer edge)
    const MAX_DIMENSION = 1024;
    let resizeWidth = cropWidth;
    let resizeHeight = cropHeight;
    
    if (cropWidth > cropHeight) {
      if (cropWidth > MAX_DIMENSION) {
        resizeWidth = MAX_DIMENSION;
        resizeHeight = (cropHeight / cropWidth) * MAX_DIMENSION;
      }
    } else {
      if (cropHeight > MAX_DIMENSION) {
        resizeHeight = MAX_DIMENSION;
        resizeWidth = (cropWidth / cropHeight) * MAX_DIMENSION;
      }
    }

    // Perform Crop and Resize
    const processed = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          crop: {
            originX,
            originY,
            width: cropWidth,
            height: cropHeight,
          },
        },
        {
          resize: {
            width: Math.round(resizeWidth),
            height: Math.round(resizeHeight),
          },
        },
      ],
      { 
        compress: 1.0, 
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );

    return {
      uri: processed.uri,
      width: processed.width,
      height: processed.height,
    };
  } catch (error) {
    // Error processing image
    throw new Error('Failed to process image for meme generation.');
  }
};
