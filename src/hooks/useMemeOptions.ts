import { useState, useEffect } from 'react';
import { getLanguages, addLanguageToDb, SelectionOption, likeLanguage } from '@/src/services/languageService';
import { getStyles, addStyleToDb, likeStyle } from '@/src/services/styleService';
import { formatTitleCase } from '@/src/utils/stringUtils';

export function useMemeOptions() {
  const [stylesList, setStylesList] = useState<SelectionOption[]>([]);
  const [languagesList, setLanguagesList] = useState<SelectionOption[]>([]);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const [langs, styles] = await Promise.all([
          getLanguages(),
          getStyles()
        ]);
        setLanguagesList(langs);
        setStylesList(styles);
      } catch (err) {
        console.error('Failed to fetch meme options:', err);
      }
    };
    
    fetchLists();
  }, []);

  const handleAddLanguage = async (
    newLang: string, 
    onSelect: (lang: string) => void, 
    onClose: () => void
  ) => {
    if (!newLang) return;
    const formattedLang = formatTitleCase(newLang);
    // Optimistic update
    if (!languagesList.some(l => l.name === formattedLang)) {
      setLanguagesList(prev => [...prev, { name: formattedLang, likes: 1 }]);
    }
    onSelect(formattedLang);
    onClose();
    
    // Save to DB
    await addLanguageToDb(formattedLang);
  };

  const handleLikeLanguage = async (lang: string) => {
    setLanguagesList(prev => prev.map(l => 
      l.name === lang ? { ...l, likes: (l.likes || 0) + 1 } : l
    ));
    await likeLanguage(lang);
  };

  const handleAddStyle = async (
    newStyle: string, 
    onSelect: (style: string) => void, 
    onClose: () => void
  ) => {
    if (!newStyle) return;
    const formattedStyle = formatTitleCase(newStyle);
    // Optimistic update
    if (!stylesList.some(s => s.name === formattedStyle)) {
      setStylesList(prev => [...prev, { name: formattedStyle, likes: 1 }]);
    }
    onSelect(formattedStyle);
    onClose();
    
    // Save to DB
    await addStyleToDb(formattedStyle);
  };

  const handleLikeStyle = async (styleName: string) => {
    setStylesList(prev => prev.map(s => 
      s.name === styleName ? { ...s, likes: (s.likes || 0) + 1 } : s
    ));
    await likeStyle(styleName);
  };

  return {
    stylesList,
    languagesList,
    handleAddLanguage,
    handleLikeLanguage,
    handleAddStyle,
    handleLikeStyle,
  };
}
