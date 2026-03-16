import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiRequest } from '@/shared/api/client';
import { GlowingCard } from '@/shared/ui/GlowingCard';
import { ArrowLeft, Calendar } from 'lucide-react';

interface Team {
  id: number;
  name: string;
  abbrev: string;
}

interface Match {
  id: number;
  date: string;
  status: string;
  home_team: Team;
  away_team: Team;
  home_score: number | null;
  away_score: number | null;
}

export const MatchPage = () => {
  const { matchId } = useParams();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatch();
  }, [matchId]);

  const loadMatch = async () => {
    try {
      const data = await apiRequest<Match>(`/matches/${matchId}`);
      console.log('Match data:', data); // Для отладки
      setMatch(data);
    } catch (err) {
      console.error('Ошибка загрузки матча:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Матч не найден</p>
        <Link to="/matches" className="text-orange-400 hover:text-orange-300 mt-4 inline-block">
          ← Назад к матчам
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto"
    >
      <Link to="/matches" className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-2 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Назад к матчам
      </Link>

      <GlowingCard glowColor="orange" className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {match.home_team?.name || 'Unknown'} vs {match.away_team?.name || 'Unknown'}
            </h1>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(match.date).toLocaleDateString()}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs ${
                match.status === 'finished'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {match.status === 'finished' ? 'Завершен' : 'Ожидается'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between py-8">
          <div className="text-center flex-1">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-white">{match.home_team?.abbrev || '???'}</span>
            </div>
            <h2 className="text-xl font-bold text-white">{match.home_team?.name || 'Unknown'}</h2>
          </div>

          {match.status === 'finished' && match.home_score !== null ? (
            <div className="text-5xl font-bold text-white px-8">
              {match.home_score} : {match.away_score}
            </div>
          ) : (
            <div className="text-2xl text-slate-500 px-8">VS</div>
          )}

          <div className="text-center flex-1">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-white">{match.away_team?.abbrev || '???'}</span>
            </div>
            <h2 className="text-xl font-bold text-white">{match.away_team?.name || 'Unknown'}</h2>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            to={`/prediction/new?team1=${match.home_team?.id}&team2=${match.away_team?.id}`}
            className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
          >
            Сделать прогноз на этот матч
          </Link>
        </div>
      </GlowingCard>
    </motion.div>
  );
};

export default MatchPage;