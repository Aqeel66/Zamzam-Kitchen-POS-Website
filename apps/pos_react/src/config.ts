export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_BASE_URL.replace('/api', '');

export const resolveImageUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  // Ensure the path starts with /assets/ for the backend to serve it correctly
  let normalizedPath = path;
  if (!normalizedPath.startsWith('assets/') && !normalizedPath.startsWith('/assets/')) {
    normalizedPath = `assets/${normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath}`;
  }
  
  return `${BASE_URL}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
};
