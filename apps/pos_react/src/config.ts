export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const BASE_URL = API_BASE_URL.replace('/api', '');

export const resolveImageUrl = (path: any) => {
  if (!path || typeof path !== 'string') return undefined;
  if (path.startsWith('http')) return path;
  
  // Strip any existing /assets/ or assets/ prefix
  let cleanPath = path.startsWith('/') ? path.slice(1) : path;
  if (cleanPath.startsWith('assets/')) {
    cleanPath = cleanPath.substring(7);
  }
  
  // Ensure we have exactly one assets/ prefix
  const normalizedPath = `assets/${cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath}`;
  
  const url = `${BASE_URL}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
  return url;
};
