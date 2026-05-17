import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/';
export const POS_URL = import.meta.env.VITE_POS_URL || '/pos/';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const resolveImageUrl = (path: string | null | undefined) => {
  if (!path) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
  if (path.startsWith('http')) return path;
  
  // Normalization for the assets path
  // Strip any existing /assets/ or assets/ prefix from the database path
  let cleanPath = path.startsWith('/') ? path.slice(1) : path;
  if (cleanPath.startsWith('assets/')) {
    cleanPath = cleanPath.substring(7);
  }
  
  const finalPath = `assets/${cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath}`;
  
  // Resolve base URL for assets (removes /api/ or /api)
  const assetBase = API_URL.replace(/\/api\/?$/, '');
  
  // If absolute URL, use it; otherwise root-relative
  const prefix = assetBase.startsWith('http') ? assetBase : '';
  const separator = finalPath.startsWith('/') ? '' : '/';
  
  return `${prefix}${separator}${finalPath}`;
};

export default api;
