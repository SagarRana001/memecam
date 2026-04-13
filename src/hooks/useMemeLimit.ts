import { useState, useEffect } from 'react';
import storage from '../utils/storage';

const MEME_LIMIT = 3;
const STORAGE_KEY = '@meme_usage_data';

interface UsageData {
  count: number;
  lastDate: string;
}

export const useMemeLimit = () => {
  const [remaining, setRemaining] = useState<number>(MEME_LIMIT);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const storedData = await storage.getItem(STORAGE_KEY);
      
      if (storedData) {
        const data: UsageData = JSON.parse(storedData);
        if (data.lastDate === today) {
          setRemaining(Math.max(0, MEME_LIMIT - data.count));
          setIsOverLimit(data.count >= MEME_LIMIT);
        } else {
          // Reset for a new day
      await storage.setItem(STORAGE_KEY, JSON.stringify({ count: 0, lastDate: today }));
          setRemaining(MEME_LIMIT);
          setIsOverLimit(false);
        }
      } else {
        await storage.setItem(STORAGE_KEY, JSON.stringify({ count: 0, lastDate: today }));
      }
    } catch (e) {
      console.error('Failed to load usage data', e);
    } finally {
      setLoading(false);
    }
  };

  const incrementUsage = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const storedData = await storage.getItem(STORAGE_KEY);
      let newCount = 1;

      if (storedData) {
        const data: UsageData = JSON.parse(storedData);
        newCount = data.lastDate === today ? data.count + 1 : 1;
      }

      await storage.setItem(STORAGE_KEY, JSON.stringify({ count: newCount, lastDate: today }));
      setRemaining(Math.max(0, MEME_LIMIT - newCount));
      setIsOverLimit(newCount >= MEME_LIMIT);
      
      return newCount;
    } catch (e) {
      console.error('Failed to increment usage', e);
      return 0;
    }
  };

  return { remaining, isOverLimit, loading, incrementUsage };
};
