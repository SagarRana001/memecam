import * as FileSystem from 'expo-file-system/legacy';
import { EncodingType } from 'expo-file-system/legacy';

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface MemeLines {
  top: string[];
  bottom: string[];
}

/**
 * Generates 4 lines of meme text (2 top, 2 bottom) for a given image URI.
 * Uses OpenRouter for AI processing.
 */
export const generateMemeLines = async (imageUri: string): Promise<MemeLines> => {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'sk-or-v1-your-key-here') {
    // Fallback if API key is not configured
    return {
      top: ['GIVE ME', 'API KEY'],
      bottom: ['SO I CAN', 'MAKE MEMES'],
    };
  }

  try {
    console.log('--- AI Brainstorming Start (OpenRouter) ---');
    console.log('Processing image URI:', imageUri);

    // 1. Read image as base64
    const base64Data = await FileSystem.readAsStringAsync(imageUri, {
      encoding: EncodingType.Base64,
    });
    console.log('Base64 Conversion: SUCCESS (Length:', base64Data.length, ')');

    // 2. Prepare the prompt and payload
    const prompt = `
      Analyze this image and generate a hilarious, viral meme caption for it.
      You MUST provide exactly 4 short, punchy lines:
      - Two distinct lines for the TOP of the meme.
      - Two distinct lines for the BOTTOM of the meme.
      
      Return ONLY a valid JSON object with the following structure:
      {
        "top": ["line 1", "line 2"],
        "bottom": ["line 3", "line 4"]
      }
    `;

    const payload = {
      model: 'google/gemini-2.0-flash-001', // High performance & low cost
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' }, // Enforce JSON response if supported
    };

    // 3. Call OpenRouter
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/memecam', // Optional, for OpenRouter ranking
        'X-Title': 'MemeCam', // Optional, for OpenRouter ranking
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API Error:', errorData);
      throw new Error(`OpenRouter API responded with status ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content || '';
    
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

    console.warn('AI response did not contain valid JSON structure.');
    throw new Error('Could not parse AI response');
  } catch (error) {
    console.error('AI Generation Error:', error);
    // Fallback on error
    return {
      top: ['AI IS SLEEPY', 'TRY AGAIN'],
      bottom: ['MAYBE CHECK', 'CONNECTION'],
    };
  }
};
