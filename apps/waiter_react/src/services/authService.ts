import api from './api';

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  roles: string[];
  permissions: string[];
}

export interface LoginResponse {
  message: string;
  user: User;
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('auth/login', { username, password });
    return response.data;
  },
  
  logout: () => {
    sessionStorage.removeItem('waiter_user');
  },
  
  getCurrentUser: (): User | null => {
    try {
      const user = sessionStorage.getItem('waiter_user');
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  },
  
  saveUser: (user: User) => {
    try {
      sessionStorage.setItem('waiter_user', JSON.stringify(user));
    } catch (e) {
      console.error('Error saving user to sessionStorage:', e);
    }
  }
};
