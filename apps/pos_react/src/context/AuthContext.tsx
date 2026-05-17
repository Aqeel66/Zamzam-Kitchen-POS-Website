import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      // Check for user data in URL (for embedded mode)
      const urlParams = new URLSearchParams(window.location.search);
      const userParam = urlParams.get('user');
      
      if (userParam) {
        const decodedUser = JSON.parse(decodeURIComponent(userParam));
        setUser(decodedUser);
        localStorage.setItem('pos_user', JSON.stringify(decodedUser));
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      const savedUser = localStorage.getItem('pos_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (err) {
      console.error('Error parsing user data:', err);
      localStorage.removeItem('pos_user');
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('pos_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pos_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
