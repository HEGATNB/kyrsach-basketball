import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/shared/api/client";
import { User } from "@/shared/api/db"; // Используем старый тип User, пока не перепишем типы

type AuthContextType = {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // При загрузке проверяем, есть ли сохраненный юзер
    const savedUser = localStorage.getItem("current_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      // ЗАПРОС НА БЭКЕНД
      const data = await apiRequest<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }) // ВНИМАНИЕ: поле password
      });

      if (data.user) {
        setUser(data.user);
        localStorage.setItem("current_user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token); // Сохраняем токен
        return true;
      }
    } catch (e) {
      alert("Ошибка входа: " + (e as Error).message);
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("current_user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAdmin: user?.role === "admin"
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
