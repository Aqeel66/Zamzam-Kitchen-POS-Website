export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const BASE_URL = API_BASE_URL.replace('/api', '');

export const resolveImageUrl = (path: any) => {
  if (!path || typeof path !== 'string') return undefined;
  if (path.startsWith('http')) return path;
  
  // Ensure the path starts with /assets/ for the backend to serve it correctly
  let normalizedPath = path;
  if (!normalizedPath.startsWith('assets/') && !normalizedPath.startsWith('/assets/')) {
    normalizedPath = `assets/${normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath}`;
  }
  
  const url = `${BASE_URL}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
  // Add a simple cache buster using a daily timestamp or similar
  return `${url}?t=${new Date().getMinutes()}`; // Busts every minute to stay fresh during configuration
};
