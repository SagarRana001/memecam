import * as ImageManipulator from 'expo-image-manipulator';

export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Processes an image according to the Memecam.in specifications:
 * 1. Crops to a square format (1:1 aspect ratio)
 * 2. Compresses/Resizes to 256x256 for optimal AI processing speed
 */
export const processMemeImage = async (uri: string): Promise<ProcessedImage> => {
  try {
    // First, let's get the original dimensions
    const result = await ImageManipulator.manipulateAsync(uri, [], { format: ImageManipulator.SaveFormat.JPEG });
    
    const size = Math.min(result.width, result.height);
    const originX = (result.width - size) / 2;
    const originY = (result.height - size) / 2;

    // Perform Square Crop and Keep High Resolution (1024x1024)
    const processed = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          crop: {
            originX,
            originY,
            width: size,
            height: size,
          },
        },
        {
          resize: {
            width: 1024,
            height: 1024,
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
    console.error('Error processing image:', error);
    throw new Error('Failed to process image for meme generation.');
  }
};
