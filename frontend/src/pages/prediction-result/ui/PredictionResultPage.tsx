import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiRequest } from '@/shared/api/client';
import { GlowingCard } from '@/shared/ui/GlowingCard';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface Prediction {
  id: string;
  probabilityTeam1: number;
  probabilityTeam2: number;
  expectedScoreTeam1: number;
  expectedScoreTeam2: number;
  confidence: number;
  team1Id: number;
  team2Id: number;
  team1?: {
    id: number;
    name: string;
    abbrev: string;
  };
  team2?: {
    id: number;
    name: string;
    abbrev: string;
  };
  createdAt: string;
}

export const PredictionResultPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('🔍 Компонент загружен, ID из URL:', id);
    
    if (!id) {
      console.error('❌ ID отсутствует в URL');
      setError('ID прогноза не указан');
      setLoading(false);
      return;
    }
    
    loadPrediction();
  }, [id]);

  const loadPrediction = async () => {
    console.log('📡 Загружаем прогноз с ID:', id);
    try {
      const data = await apiRequest<Prediction>(`/predictions/${id}`);
      console.log('✅ Получен прогноз:', data);
      setPrediction(data);
    } catch (err: any) {
      console.error('❌ Ошибка загрузки прогноза:', err);
      setError(err.message || 'Прогноз не найден');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError('');
    loadPrediction();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Загрузка прогноза...</p>
        </div>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-xl mb-4">{error || 'Прогноз не найден'}</p>
        <p className="text-slate-400 mb-2">ID прогноза: {id || 'не указан'}</p>
        <p className="text-slate-500 text-sm mb-8">Проверьте консоль браузера (F12) для отладки</p>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Повторить
          </button>
          
          <Link
            to="/prediction/new"
            className="px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
          >
            Создать новый
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto"
    >
      <Link to="/prediction/new" className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-2 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Новый прогноз
      </Link>

      <GlowingCard glowColor="orange" className="p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Результат AI анализа</h1>
          <p className="text-slate-400">Уверенность модели: {prediction.confidence || 0}%</p>
          <p className="text-xs text-slate-600 mt-2">ID: {prediction.id}</p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
          <div className="text-center flex-1">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-white">
                {prediction.team1?.abbrev || `T${prediction.team1Id}`}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {prediction.team1?.name || `Команда ${prediction.team1Id}`}
            </h3>
            <div className="text-4xl font-bold text-orange-400 mb-2">
              {prediction.probabilityTeam1}%
            </div>
            <p className="text-slate-400">
              Ожидаемые очки: {prediction.expectedScoreTeam1}
            </p>
          </div>

          <div className="text-2xl font-bold text-slate-500">VS</div>

          <div className="text-center flex-1">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-white">
                {prediction.team2?.abbrev || `T${prediction.team2Id}`}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {prediction.team2?.name || `Команда ${prediction.team2Id}`}
            </h3>
            <div className="text-4xl font-bold text-blue-400 mb-2">
              {prediction.probabilityTeam2}%
            </div>
            <p className="text-slate-400">
              Ожидаемые очки: {prediction.expectedScoreTeam2}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>{prediction.team1?.name || 'Команда 1'}</span>
            <span>{prediction.team2?.name || 'Команда 2'}</span>
          </div>
          <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${prediction.probabilityTeam1}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${prediction.probabilityTeam2}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
            />
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Link
            to="/prediction/new"
            className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600"
          >
            Новый прогноз
          </Link>
          <Link
            to="/history"
            className="px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700"
          >
            История
          </Link>
        </div>
      </GlowingCard>
    </motion.div>
  );
};

export default PredictionResultPage;