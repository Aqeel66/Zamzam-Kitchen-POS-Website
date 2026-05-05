export const API_BASE_URL = '/api';
export const ASSETS_BASE_URL = '/assets';

export const resolveImageUrl = (path: string | null | undefined, fallback = '/placeholder-food.jpg') => {
  if (!path) return fallback;
  if (path.startsWith('http')) return path;
  // Remove leading slashes/assets if present to match backend serve logic
  const cleanPath = path.replace(/^\/?(assets\/)?/, '');
  return `${ASSETS_BASE_URL}/${cleanPath}`;
};
