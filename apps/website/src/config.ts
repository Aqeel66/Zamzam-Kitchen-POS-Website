export const API_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:5000/api' 
  : '/api';

export const ASSETS_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:5000/assets' 
  : '/assets';

export const resolveImageUrl = (path: string | null | undefined, fallback = '/placeholder-food.jpg') => {
  if (!path) return fallback;
  if (path.startsWith('http')) return path;
  // Remove leading slashes/assets if present to match backend serve logic
  const cleanPath = path.replace(/^\/?(assets\/)?/, '');
  return `${ASSETS_BASE_URL}/${cleanPath}`;
};
