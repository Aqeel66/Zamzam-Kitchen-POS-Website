import axios from 'axios';

// Ensure we target the root API correctly regardless of where the app is hosted
const api = axios.create({
  baseURL: '/api/',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const resolveImageUrl = (path: string | null) => {
  if (!path) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
  if (path.startsWith('http')) return path;
  // Normalize the path to ensure it points to the assets folder
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const finalPath = cleanPath.startsWith('assets/') ? cleanPath : `assets/${cleanPath}`;
  return `/${finalPath}`;
};

export default api;
