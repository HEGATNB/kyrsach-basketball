// Адрес твоего бэкенда
const API_URL = 'http://localhost:8000/api/auth';

export interface User {
  id: number;
  email: string;
  username: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export const authService = {
  // Регистрация
  async register(userData: any) {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Ошибка регистрации');
    }
    return response.json();
  },

  // Вход (Login)
  async login(credentials: { username: string; password: string }) {
    // FastAPI ожидает данные формы (OAuth2PasswordRequestForm), а не JSON
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded' 
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Ошибка входа');
    }

    const data: AuthResponse = await response.json();
    // Сохраняем токен в LocalStorage
    localStorage.setItem('token', data.access_token);
    return data;
  },

  // Выход
  logout() {
    localStorage.removeItem('token');
  },

  // Получение токена (для добавления в заголовки других запросов)
  getToken() {
    return localStorage.getItem('token');
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  }
};