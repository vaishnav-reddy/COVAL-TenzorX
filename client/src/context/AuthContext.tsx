import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id?: string;
  name: string;
  email: string;
  company?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('coval_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('coval_token') || null;
  });

  function login(userData: User, authToken: string) {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('coval_user', JSON.stringify(userData));
    localStorage.setItem('coval_token', authToken);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('coval_user');
    localStorage.removeItem('coval_token');
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user && !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
