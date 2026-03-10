import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiRequest } from '@/shared/api/client';
import { GlowingCard } from '@/shared/ui/GlowingCard';
import { useAuth } from '@/app/providers/AuthProvider';
import { Cpu, Zap, Activity } from 'lucide-react';

interface Team {
  id: number;
  name: string;
  wins: number;
  losses: number;
}

export const PredictionNewPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const data = await apiRequest<Team[]>('/teams');
      setTeams(data);
    } catch (err) {
      console.error('Ошибка загрузки команд:', err);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handlePredict = async () => {
    if (!team1Id || !team2Id) {
      alert('Выберите обе команды');
      return;
    }
    if (team1Id === team2Id) {
      alert('Команды должны быть разными');
      return;
    }

    setLoading(true);
    try {
      const result = await apiRequest<any>('/predict', {
        method: 'POST',
        body: JSON.stringify({
          team1_id: Number(team1Id),
          team2_id: Number(team2Id)
        })
      });
      
      if (!result.id) {
        throw new Error('Сервер не вернул ID прогноза');
      }
      
      setTimeout(() => {
        navigate(`/prediction/${result.id}`);
      }, 500);
      
    } catch (err: any) {
      console.error('❌ Ошибка:', err);
      alert(err.message || 'Ошибка при создании прогноза');
      setLoading(false);
    }
  };

  if (loadingTeams) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Cpu className="w-8 h-8 text-orange-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 relative z-10">
      
      <div className="text-center mb-12">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.5)] mb-6"
        >
          <Cpu className="w-10 h-10 text-white" />
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl md:text-7xl font-black font-spacegrotesk mb-4 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 text-glow-orange"
        >
          NEXUS AI
        </motion.h1>
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto"
        >
          Продвинутая модель прогнозирования исходов матчей. 
          Выберите команды для анализа нейросетью.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
            
            {/* Team 1 Selector */}
            <div className="flex-1 w-full relative group">
              <label className="block text-sm font-bold text-orange-400 uppercase tracking-widest mb-3 pl-2">Хозяева площадки</label>
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative bg-slate-900/80 ring-1 ring-white/10 rounded-2xl p-2 backdrop-blur-sm">
                <select
                  value={team1Id}
                  onChange={(e) => setTeam1Id(e.target.value)}
                  className="w-full bg-transparent text-xl md:text-2xl font-bold text-white px-4 py-4 appearance-none outline-none cursor-pointer"
                  disabled={loading}
                >
                  <option value="" className="bg-slate-900 text-slate-500 text-lg">Выбрать команду...</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id} className="bg-slate-800 text-lg">
                      {t.name} ({t.wins}-{t.losses})
                    </option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Activity className="w-6 h-6 text-slate-400" />
                </div>
              </div>
            </div>

            {/* VS Badge */}
            <div className="flex-shrink-0 relative">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-2xl relative z-10">
                <span className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-slate-200 to-slate-500">VS</span>
              </div>
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-orange-500 to-blue-500 rounded-full blur-xl opacity-30 animate-pulse-glow" />
            </div>

            {/* Team 2 Selector */}
            <div className="flex-1 w-full relative group">
              <label className="block text-sm font-bold text-blue-400 uppercase tracking-widest mb-3 pl-2 text-right md:text-left">Команда гостей</label>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative bg-slate-900/80 ring-1 ring-white/10 rounded-2xl p-2 backdrop-blur-sm">
                <select
                  value={team2Id}
                  onChange={(e) => setTeam2Id(e.target.value)}
                  className="w-full bg-transparent text-xl md:text-2xl font-bold text-white px-4 py-4 appearance-none outline-none cursor-pointer text-right md:text-left"
                  disabled={loading}
                >
                  <option value="" className="bg-slate-900 text-slate-500 text-lg">Выбрать команду...</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id} className="bg-slate-800 text-lg">
                      {t.name} ({t.wins}-{t.losses})
                    </option>
                  ))}
                </select>
                <div className="absolute left-6 md:right-6 md:left-auto top-1/2 -translate-y-1/2 pointer-events-none">
                  <Zap className="w-6 h-6 text-slate-400" />
                </div>
              </div>
            </div>

          </div>

          <div className="mt-12">
            <button
              onClick={handlePredict}
              disabled={loading || !team1Id || !team2Id}
              className={`w-full py-6 rounded-2xl font-black text-2xl tracking-wide uppercase transition-all duration-500 flex items-center justify-center gap-4
                ${loading 
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed' 
                  : (!team1Id || !team2Id)
                    ? 'bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 bg-[length:200%_auto] text-white hover:bg-[100%_auto] hover:scale-[1.02] shadow-[0_0_40px_rgba(249,115,22,0.4)]'
                }`}
            >
              {loading ? (
                <>
                  <div className="w-8 h-8 border-4 border-slate-500 border-t-orange-500 rounded-full animate-spin" />
                  <span>Идет анализ...</span>
                </>
              ) : (
                <>
                  <Zap className="w-8 h-8" />
                  Запустить AI Прогноз
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PredictionNewPage;