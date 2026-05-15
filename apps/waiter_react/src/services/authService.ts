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
    localStorage.removeItem('waiter_user');
  },
  
  getCurrentUser: (): User | null => {
    const user = localStorage.getItem('waiter_user');
    return user ? JSON.parse(user) : null;
  },
  
  saveUser: (user: User) => {
    localStorage.setItem('waiter_user', JSON.stringify(user));
  }
};
