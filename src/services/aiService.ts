import * as FileSystem from 'expo-file-system/legacy';
import { EncodingType } from 'expo-file-system/legacy';

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';

// We use OpenRouter models now
const AVAILABLE_MODELS = ["google/gemini-2.5-flash", "google/gemini-2.0-flash-001"];

export interface MemeLines {
  top: string[];
  bottom: string[];
}

/**
 * Generates 4 lines of meme text (2 top, 2 bottom) for a given image URI.
 * Uses OpenRouter API for AI processing with fallback support for 503 errors.
 */
export const generateMemeLines = async (
  imageUri: string,
  style: string = 'Funny',
  language: string = 'English'
): Promise<MemeLines> => {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your-openrouter-api-key-here') {
    // Fallback if API key is not configured
    return {
      top: ['GIVE ME', 'OPENROUTER KEY'],
      bottom: ['SO I CAN', 'MAKE MEMES'],
    };
  }

  // 1. Prepare image data (Handle remote vs local URIs)
  let base64Data = '';
  let tempFileUri: string | null = null;
  
  try {
    let localUri = imageUri;
    
    // If it's a remote URL (e.g. from Supabase), download it to local cache first
    if (imageUri.startsWith('http')) {
      const fileName = `temp_${Date.now()}.jpg`;
      const destination = `${FileSystem.cacheDirectory}${fileName}`;
      const download = await FileSystem.downloadAsync(imageUri, destination);
      localUri = download.uri;
      tempFileUri = download.uri;
    }

    base64Data = await FileSystem.readAsStringAsync(localUri, {
      encoding: EncodingType.Base64,
    });

    // Clean up temporary file if we created one
    if (tempFileUri) {
      await FileSystem.deleteAsync(tempFileUri, { idempotent: true }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to prepare image for AI processing:', err);
    throw new Error('Failed to analyze the image. Please check your internet and try again! 🔥');
  }

  // 2. Prepare the prompt
  const styleDescription = style === 'Roast'
    ? 'Absolutely savage, brutal, unapologetic roast. Destroy the subject of this image with words. High-energy, viral internet-style mockery.'
    : style === 'Dark'
      ? 'Extremely edgy, cynical, bleak, and unhinged dark humor. The kind of joke you feel bad for laughing at. Uncomfortable but hilarious.'
      : style === 'Cute'
        ? 'Overwhelmingly wholesome, sweet, adorable, and pure. Soft, squishy internet-animal text style (e.g., "smol", "heckin"). Makes you go "aww".'
        : 'Hilarious, incredibly relatable, highly viral internet meme humor. Clever, absurd, and punchy.';

  const languageInstruction = language === 'Hinglish'
    ? 'Write the captions specifically in Hinglish (Hindi written in Roman/English script, e.g., "bhai kya kar raha hai"). Make it sound natural and colloquial.'
    : language === 'English'
      ? 'Write the captions in internet-fluent English.'
      : `Write the captions natively in ${language} (using its native script).`;

  const prompt = `
    You are an expert, viral meme creator. Analyze this image and generate a VERY SHORT, incredibly punchy ${style.toUpperCase()} meme caption for it.
    
    Vibe/Style: ${styleDescription}
    Language: ${languageInstruction}

    Rules:
    - Don't be boring. Go all-in on the requested vibe.
    - Keep it internet-authentic. Use meme phrasing where appropriate.
    - You MUST provide exactly 4 VERY SHORT, concise lines (max 3-5 words per line).
    - Two distinct lines for the TOP of the meme.
    - Two distinct lines for the BOTTOM of the meme.
    
    Return ONLY a valid JSON object with the following structure:
    {
      "top": ["line 1", "line 2"],
      "bottom": ["line 3", "line 4"]
    }
  `;

  // 3. Call OpenRouter API with model fallback
  for (let i = 0; i < AVAILABLE_MODELS.length; i++) {
    const modelName = AVAILABLE_MODELS[i];
    try {
      console.log(`--- AI Brainstorming Start (Model: ${modelName}) ---`);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://memecam.app",
          "X-Title": "Memecam",
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 500, // Limit tokens to prevent 402 insufficient credit errors
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Data}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content;

      if (!responseText) {
        throw new Error("Empty response from OpenRouter");
      }

      // 4. Clean and parse JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
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
      const is503 = error.message?.includes('503') || error.status === 503 || error.message?.includes('demand');
      const isLastModel = i === AVAILABLE_MODELS.length - 1;

      if (is503 && !isLastModel) {
        console.warn(`Model ${modelName} is overloaded (503). Attempting fallback to ${AVAILABLE_MODELS[i + 1]}...`);
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      }

      console.error(`AI Generation Error with model ${modelName}:`, error);

      // Map common OpenRouter/Gemini error messages to user-friendly ones
      let userFriendlyMsg = error.message || '';
      
      if (userFriendlyMsg.includes('Safety') || userFriendlyMsg.includes('flagged') || userFriendlyMsg.includes('moderation')) {
        userFriendlyMsg = 'This image was flagged by our safety filters. Please try another one! 🛡️';
      } else if (userFriendlyMsg.includes('quota') || userFriendlyMsg.includes('429')) {
        userFriendlyMsg = 'Our cosmic AI limits have been reached for this minute. Try again shortly! ⏳';
      } else if (userFriendlyMsg.includes('503') || userFriendlyMsg.includes('demand') || userFriendlyMsg.includes('overloaded')) {
        userFriendlyMsg = 'The fire lab is extremely busy right now. Please try again in a few moments! 🔥';
      } else {
        userFriendlyMsg = 'The AI is currently brainstorming too hard. Please try again in a few seconds! 🧠🔥';
      }

      // Re-throw with user-friendly message
      throw new Error(userFriendlyMsg);
    }
  }

  throw new Error('AI Brainstorming failed. Check your internet and try again soon! 🔥');
};
