import React from 'react';

export const MatchesPage = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Матчи и прогнозы</h2>
      <p className="text-slate-400 text-sm">
        Здесь будет список матчей, прогноз модели и результаты симуляций.
      </p>
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-slate-300 text-sm">
        Тоже заглушка. Можно будет сделать «живой» матч с комментариями и визуализацией.
      </div>
    </div>
  );
};

export default MatchesPage;
