import { GoogleGenerativeAI } from "@google/generative-ai";
import * as FileSystem from 'expo-file-system/legacy';
import { EncodingType } from 'expo-file-system/legacy';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
// Initialize the Google Generative AI SDK
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const AVAILABLE_MODELS = ["gemini-2.5-flash"];

export interface MemeLines {
  top: string[];
  bottom: string[];
}

/**
 * Generates 4 lines of meme text (2 top, 2 bottom) for a given image URI.
 * Uses Google Gemini SDK for AI processing with fallback support for 503 errors.
 */
export const generateMemeLines = async (
  imageUri: string,
  style: string = 'Funny',
  language: string = 'English'
): Promise<MemeLines> => {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key-here') {
    // Fallback if API key is not configured
    return {
      top: ['GIVE ME', 'GEMINI KEY'],
      bottom: ['SO I CAN', 'MAKE MEMES'],
    };
  }

  // 1. Read image as base64 (once, outside the loop)
  let base64Data = '';
  try {
    base64Data = await FileSystem.readAsStringAsync(imageUri, {
      encoding: EncodingType.Base64,
    });
    console.log('Base64 Conversion: SUCCESS (Length:', base64Data.length, ')');
  } catch (err) {
    console.error('Failed to read image for AI processing:', err);
    throw err;
  }

  // 2. Prepare the prompt
  const styleDescription = style === 'Roast'
    ? 'Savage, insulting (in a funny way), and high-energy roast.'
    : style === 'Dark'
      ? 'Edgy, cynical, and dark humor.'
      : style === 'Cute'
        ? 'Wholesome, sweet, and adorable.'
        : 'Humorous, witty, and lighthearted.';

  const languageInstruction = language === 'Hinglish'
    ? 'Write the captions specifically in Hinglish (Hindi written in Roman/English script).'
    : language === 'English'
      ? 'Write the captions in English.'
      : `Write the captions in ${language} (using its native script).`;

  const prompt = `
    Analyze this image and generate a VERY SHORT, punchy ${style.toUpperCase()} meme caption for it.
    Vibe/Style: ${styleDescription}
    Language: ${languageInstruction}

    You MUST provide exactly 4 VERY SHORT, concise lines (max 3-4 words per line):
    - Two distinct lines for the TOP of the meme.
    - Two distinct lines for the BOTTOM of the meme.
    
    Return ONLY a valid JSON object with the following structure:
    {
      "top": ["line 1", "line 2"],
      "bottom": ["line 3", "line 4"]
    }
  `;

  // 3. Call Gemini SDK with model fallback
  for (let i = 0; i < AVAILABLE_MODELS.length; i++) {
    const modelName = AVAILABLE_MODELS[i];
    try {
      console.log(`--- AI Brainstorming Start (Model: ${modelName}) ---`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      console.log('--- RAW AI RESPONSE ---');
      console.log(responseText);
      console.log('-----------------------');

      // 4. Clean and parse JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('JSON Parsing: SUCCESS');
          return {
            top: Array.isArray(parsed.top) ? parsed.top : [String(parsed.top || ''), ''],
            bottom: Array.isArray(parsed.bottom) ? parsed.bottom : [String(parsed.bottom || ''), ''],
          };
        } catch (e) {
          console.error('JSON Parse Error:', e);
        }
      }

      throw new Error('AI returned an invalid format. This usually happens with complex images. Please try again with a different style! 🔥');
    } catch (error: any) {
      const isLastModel = i === AVAILABLE_MODELS.length - 1;
      const is503 = error.message?.includes('503') || error.status === 503;

      if (is503 && !isLastModel) {
        console.warn(`Model ${modelName} is overloaded (503). Attempting fallback to ${AVAILABLE_MODELS[i + 1]}...`);
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      console.error(`AI Generation Error with model ${modelName}:`, error);

      // Map common Gemini error messages to user-friendly ones
      let userFriendlyMsg = error.message || 'The AI is currently brainstorming too hard. Please try again in a few seconds! 🔥';
      
      if (userFriendlyMsg.includes('Safety')) {
        userFriendlyMsg = 'This image was flagged by our safety filters. Please try another one! 🛡️';
      } else if (userFriendlyMsg.includes('quota')) {
        userFriendlyMsg = 'Our cosmic AI limits have been reached for this minute. Try again shortly! ⏳';
      }

      // Re-throw with user-friendly message
      throw new Error(userFriendlyMsg);
    }
  }

  throw new Error('AI Brainstorming failed. Check your internet and try again soon! 🔥');
};
