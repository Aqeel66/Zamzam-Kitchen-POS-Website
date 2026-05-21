import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/authService';
import type { User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // Only restore session on page reload — not on new tab/fresh navigation.
      // sessionStorage is inherited by tabs opened from existing tabs, so we
      // must check the navigation type to avoid bypassing login.
      const navEntries = performance.getEntriesByType('navigation');
      const navType = navEntries.length > 0
        ? (navEntries[0] as PerformanceNavigationTiming).type
        : 'navigate';

      if (navType === 'reload' || navType === 'back_forward') {
        const savedUser = authService.getCurrentUser();
        if (savedUser) {
          setUser(savedUser);
        }
      } else {
        // New navigation (new tab, direct URL, link click) — clear inherited session
        authService.logout();
      }
    } catch (_err) {
      authService.logout();
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authService.login(username, password);
    setUser(response.user);
    authService.saveUser(response.user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
