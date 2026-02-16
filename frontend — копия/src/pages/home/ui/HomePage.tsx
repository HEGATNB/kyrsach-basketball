import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Trophy, TrendingUp, Cpu, Flame } from 'lucide-react';

const Card = ({ children, className, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay }}
    whileHover={{ y: -4, scale: 1.01 }}
    className={`relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-[0_18px_45px_rgba(15,23,42,0.9)] ${className}`}
  >
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent opacity-70" />
    {children}
  </motion.div>
);

export const HomePage = () => {
  const [aiConfidence, setAiConfidence] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAiConfidence(prev => (prev < 87 ? prev + 1 : 87));
    }, 18);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 uppercase italic">
            Hoops<span className="text-orange-500">AI</span>
          </h1>
          <p className="text-slate-400 text-base md:text-lg mt-1 max-w-xl">
            Платформа продвинутой аналитики NBA с акцентом на визуал и умное прогнозирование.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-green-400">
            System online
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <Card className="col-span-1 md:col-span-2 row-span-2 p-6 md:p-7">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Season Accuracy</h3>
              <p className="text-slate-400 text-xs mt-1">Model v2.4 · Regular Season</p>
            </div>
            <Cpu className="w-7 h-7 text-orange-400" />
          </div>

          <div className="mt-8 flex items-end gap-4">
            <span className="text-6xl md:text-7xl font-black tracking-tight text-white font-mono">
              {aiConfidence}%
            </span>
            <div className="mb-3">
              <div className="flex items-center gap-1 text-green-400 text-sm font-semibold">
                <TrendingUp className="w-4 h-4" />
                <span>+2.4% за неделю</span>
              </div>
              <p className="text-xs text-slate-500">По сравнению с прошлым блоком игр</p>
            </div>
          </div>

          <div className="mt-6 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${aiConfidence}%` }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-orange-500 via-yellow-400 to-emerald-400"
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="space-y-1">
              <p className="text-slate-500 uppercase tracking-widest">Обучающих игр</p>
              <p className="font-mono text-base">12 584</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 uppercase tracking-widest">Модель</p>
              <p className="font-mono text-base">Hybrid Heuristic + ML</p>
            </div>
          </div>
        </Card>

        <Card className="col-span-1 p-6 bg-gradient-to-br from-yellow-900/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-yellow-300">
              Power Ranking #1
            </span>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-900 border border-yellow-500/60 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.35)] mb-3">
              <span className="text-2xl font-black tracking-tight">GSW</span>
            </div>
            <h4 className="text-lg font-semibold text-white">Golden State Warriors</h4>
            <p className="mt-1 text-xs text-yellow-300 font-mono">Win Rate: 0.850</p>
          </div>
        </Card>

        <Card className="col-span-1 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-red-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-300">
              Hot Streak
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span>Boston Celtics</span>
              <span className="font-mono text-xs text-green-400 font-semibold">
                W W W W L
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span>Denver Nuggets</span>
              <span className="font-mono text-xs text-green-300 font-semibold">
                W W W L W
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>LA Lakers</span>
              <span className="font-mono text-xs text-red-400 font-semibold">
                L L W L L
              </span>
            </div>
          </div>
        </Card>

        <Card className="col-span-1 md:col-span-3 lg:col-span-4 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <h3 className="text-sm font-semibold tracking-[0.2em] uppercase text-slate-300">
                Live Simulation
              </h3>
            </div>
            <span className="text-[11px] px-2 py-1 rounded-full border border-slate-700 text-slate-400">
              Q4 · 02:14 · Oracle Arena
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">
                Home
              </p>
              <h2 className="text-4xl md:text-5xl font-black text-white">108</h2>
              <p className="mt-1 text-sm text-slate-300">Chicago Bulls</p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="px-4 py-1 rounded-full bg-slate-900 border border-slate-700 flex items-center gap-2 text-xs font-semibold">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span className="text-slate-200">AI Match Prediction</span>
              </div>
              <div className="w-40 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full w-[65%] bg-gradient-to-r from-emerald-400 to-orange-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                Home Win Probability: <span className="text-emerald-400 font-mono">65%</span>
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">
                Away
              </p>
              <h2 className="text-4xl md:text-5xl font-black text-slate-500">102</h2>
              <p className="mt-1 text-sm text-slate-300">Miami Heat</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
