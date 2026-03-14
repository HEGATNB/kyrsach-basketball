import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService, type User } from './auth.service';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isOperator: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем, есть ли сохраненный пользователь
    const token = localStorage.getItem('token');
    
    if (token) {
      // Если есть токен, пробуем получить данные пользователя
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const token = authService.getToken();
      if (!token) throw new Error('No token');

      const response = await fetch('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (e) {
      console.error('Ошибка получения пользователя:', e);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      await authService.login({ username, password });
      await fetchUser(); // Получаем данные пользователя после входа
      return true;
    } catch (e) {
      console.error('Ошибка входа:', e);
      return false;
    }
  };

  const register = async (data: any) => {
    try {
      await authService.register(data);
      // После регистрации можно сразу логинить или просить войти
      // Для простоты просто вернем true, пусть пользователь войдет
      return true;
    } catch (e) {
      console.error('Ошибка регистрации:', e);
      throw e;
    }
  };

  const logout = () => {
    setUser(null);
    authService.logout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAdmin: user?.role === 'admin',
        isOperator: user?.role === 'operator' || user?.role === 'admin',
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};