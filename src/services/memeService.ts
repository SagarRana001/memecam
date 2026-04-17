import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';


// Polyfill atob if not present (older RN environments)
const atobPolyfill = (input: string) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input.replace(/[=]+$/, '');
  let output = '';

  if (str.length % 4 === 1) throw new Error('atob failed: The string to be decoded is not correctly encoded.');

  for (let bc = 0, bs = 0, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
};

// Manual base64 to ArrayBuffer utility to avoid external dependency issues
const base64ToArrayBuffer = (base64: string) => {
  const binaryString = (typeof atob !== 'undefined') ? atob(base64) : atobPolyfill(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};




export interface MemeData {
  user_id: string;
  image_url: string;
  caption: string;
  metadata?: {
    style?: string;
    language?: string;
    topLines?: string[];
    bottomLines?: string[];
  };
}

const BUCKET_NAME = 'memes';

/**
 * Uploads an image from a local URI to Supabase Storage
 */
export const uploadMemeImage = async (uri: string, userId: string): Promise<string> => {
  try {
    // 1. Read file as base64 using Expo FileSystem
    // Use the base uri if it doesn't have a protocol
    const cleanUri = uri.startsWith('file://') ? uri : `file://${uri}`;
    
    const base64 = await FileSystem.readAsStringAsync(cleanUri, {
      encoding: 'base64' as any,
    });


    // 2. Convert to ArrayBuffer
    const arrayBuffer = base64ToArrayBuffer(base64);

    // 3. Generate unique filename
    const filename = `${userId}/${Date.now()}.jpg`;
    
    // 4. Upload to storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    // 5. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error: any) {
    console.error('Upload Error Details:', error);
    // Return a more descriptive error message to the UI
    const msg = error.message || 'Check your Supabase project bucket and RLS policies.';
    throw new Error(`Cloud Upload Failed: ${msg}`);
  }
};



/**
 * Saves meme record to the database
 */
export const saveMemeToDb = async (meme: MemeData) => {
  const { data, error } = await supabase
    .from('memes')
    .insert([
      {
        user_id: meme.user_id,
        image_url: meme.image_url,
        caption: meme.caption,
        top_lines: meme.metadata?.topLines,
        bottom_lines: meme.metadata?.bottomLines,
        style: meme.metadata?.style,
        language: meme.metadata?.language
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Fetches the current user's profile and handles daily generation count reset
 */
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;

  // Handle Daily Reset logic
  const today = new Date().toISOString().split('T')[0];
  if (data.last_generation_date !== today) {
    // Reset count for the new day in Supabase
    const { data: updatedData, error: updateError } = await supabase
      .from('profiles')
      .update({
        memes_generated_today: 0,
        last_generation_date: today
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (updateError) {
      console.warn('Silent reset failure:', updateError);
      return data; // Return old data if reset fails, to avoid blocking user
    }
    return updatedData;
  }

  return data;
};

/**
 * Increments the daily meme generation count in the profiles table
 */
export const incrementMemeCount = async (userId: string) => {
  // We use a manual increment here, but ideally this would be a DB function
  const { data, error } = await supabase
    .from('profiles')
    .select('memes_generated_today')
    .eq('id', userId)
    .single();

  if (error) throw error;

  const newCount = (data.memes_generated_today || 0) + 1;

  await supabase
    .from('profiles')
    .update({ memes_generated_today: newCount })
    .eq('id', userId);
};

/**
 * Updated to fetch count from the profiles table instead of counting memes rows
 */
export const getUserMemeCount = async (userId: string): Promise<number> => {
  try {
    const profile = await getUserProfile(userId);
    // If user is a subscriber, return 0 to bypass any UI limits
    if (profile.is_subscriber) return 0;
    return profile.memes_generated_today || 0;
  } catch (error) {
    console.error('Failed to fetch profile count:', error);
    return 0;
  }
};


/**
 * Fetches all memes for a user
 */
export const getUserMemes = async (userId: string) => {
  const { data, error } = await supabase
    .from('memes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};
