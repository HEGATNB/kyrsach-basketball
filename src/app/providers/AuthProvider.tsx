import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, dbUsers, logAction, initDB } from "@/shared/api/db";

// Тип контекста
type AuthContextType = {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isOperator: boolean;
};

// Создаем контекст
const AuthContext = createContext<AuthContextType | null>(null);

// Компонент-провайдер
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    initDB(); // Инициализируем "базу данных"
    const savedUser = localStorage.getItem("current_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Ошибка парсинга пользователя", e);
      }
    }
  }, []);

  const login = async (email: string, pass: string) => {
    // Имитация задержки сети (опционально)
    // await new Promise(r => setTimeout(r, 500)); 

    const foundUser = dbUsers.findByEmail(email);

    if (foundUser && foundUser.passwordHash === pass) {
      if (foundUser.isBlocked) {
        alert("Пользователь заблокирован");
        return false;
      }
      setUser(foundUser);
      localStorage.setItem("current_user", JSON.stringify(foundUser));
      logAction(foundUser, "login", "user", "Вход в систему");
      return true;
    }
    return false;
  };

  const logout = () => {
    if (user) {
      logAction(user, "login", "user", "Выход из системы");
    }
    setUser(null);
    localStorage.removeItem("current_user");
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAdmin: user?.role === "admin",
      isOperator: user?.role === "operator" || user?.role === "admin",
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Хук для использования
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
