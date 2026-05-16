/**
 * Formats a string to have the first letter capitalized and the rest lowercase.
 * Example: "Hinglish" -> "Hinglish", "hinglish" -> "Hinglish", "HINGLISH" -> "Hinglish"
 */
export const formatTitleCase = (text: string): string => {
  if (!text) return '';
  const cleaned = text.trim();
  if (cleaned.length === 0) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
};
