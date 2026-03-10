import type { Team } from "@/entities/team/model/types";
import type { Match } from "@/entities/match/model/types";
import type { Prediction } from "@/entities/prediction/model/types";

export interface Player {
  id: number;
  first_name: string;
  last_name: string;
  number?: number;
  position?: string;
  team_id: number;
  height?: string;
  weight?: number;
  birth_date?: string;
  points_per_game: number;
  rebounds_per_game: number;
  assists_per_game: number;
  image_url?: string;
}

export type { Team, Match, Prediction };

const API_BASE = 'http://localhost:8000/api';

// Простое кэширование в памяти
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

export async function apiRequest<T>(
  endpoint: string, 
  options?: RequestInit,
  useCache: boolean = true
): Promise<T> {
  const token = localStorage.getItem('token');
  const cacheKey = `${options?.method || 'GET'}-${endpoint}`;
  
  // Только для GET-запросов используем кэш
  if (useCache && (!options?.method || options.method === 'GET')) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`📦 Cache hit for ${endpoint}`);
      return cached.data as T;
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options?.headers || {}),
  };

  try {
    console.log(`📡 Запрос к ${API_BASE}${endpoint}`);
    
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const responseText = await res.text();

    if (!res.ok) {
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.error || `HTTP Error ${res.status}`);
      } catch {
        throw new Error(`HTTP Error ${res.status}: ${responseText}`);
      }
    }

    const data = JSON.parse(responseText) as T;
    
    // Сохраняем в кэш для GET-запросов
    if (!options?.method || options.method === 'GET') {
      cache.set(cacheKey, { data, timestamp: Date.now() });
    }
    
    return data;
    
  } catch (err) {
    console.error(`❌ API Error (${endpoint}):`, err);
    throw err;
  }
}

// Функция для очистки кэша
export function clearCache() {
  cache.clear();
  console.log('🧹 Cache cleared');
}