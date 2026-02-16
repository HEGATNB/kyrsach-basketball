// ФРОНТЕНД

const API_BASE = 'http://localhost:3000/api';

// Типы ответов (DTO)
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Универсальная функция запроса
export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options?.headers || {}),
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    
    // Если сервер упал или 404
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP Error ${res.status}`);
    }

    return res.json() as Promise<T>;
  } catch (err) {
    console.error(`API Error (${endpoint}):`, err);
    throw err;
  }
}
