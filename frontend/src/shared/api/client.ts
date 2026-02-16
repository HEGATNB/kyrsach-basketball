const API_BASE = 'http://localhost:3001/api';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Универсальная функция запроса
export async function apiRequest<T>(
  endpoint: string, 
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options?.headers || {}),
  };

  try {
    console.log(`📡 Запрос к ${API_BASE}${endpoint}`, options?.method || 'GET');
    
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // Сначала получаем текст ответа
    const responseText = await res.text();
    console.log(`📦 Ответ от ${endpoint}:`, responseText);

    if (!res.ok) {
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.error || `HTTP Error ${res.status}`);
      } catch {
        throw new Error(`HTTP Error ${res.status}: ${responseText}`);
      }
    }

    // Парсим JSON
    try {
      const data = JSON.parse(responseText) as T;
      return data;
    } catch (e) {
      console.error('❌ Ошибка парсинга JSON:', responseText);
      throw new Error('Неверный формат ответа от сервера');
    }
    
  } catch (err) {
    console.error(`❌ API Error (${endpoint}):`, err);
    throw err;
  }
}

// Типы данных
export interface Team {
  id: number;
  name: string;
  abbrev: string;
  fullName: string;
  nickname: string;
  city: string;
  arena: string;
  foundedYear: number;
  championships: number;
  wins: number;
  losses: number;
  pointsPerGame: number;
  pointsAgainst: number;
  conferenceId: number;
  divisionId: number;
  conference?: {
    id: number;
    name: string;
    shortName: string;
  };
  division?: {
    id: number;
    name: string;
  };
}

export interface Player {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string;
  height: number;
  weight: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  teamId: number;
  team?: Team;
}

export interface Match {
  id: number;
  date: string;
  status: string;
  homeTeamId: number;
  homeTeam: Team;
  homeScore: number;
  awayTeamId: number;
  awayTeam: Team;
  awayScore: number;
}

export interface Prediction {
  id: string;
  probabilityTeam1: number;
  probabilityTeam2: number;
  expectedScoreTeam1: number;
  expectedScoreTeam2: number;
  confidence: number;
  factors?: any;
  team1Id: number;
  team2Id: number;
  team1?: Team;
  team2?: Team;
  createdAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}