import React from 'react';

export const TeamsPage = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Команды NBA</h2>
      <p className="text-slate-400 text-sm">
        Здесь можно вывести таблицу команд, карточки с рейтингами, фильтры и т.д.
      </p>
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-slate-300 text-sm">
        Временно заглушка. Данные подтягиваются с бэкенда, дизайн подгоним под главную страницу.
      </div>
    </div>
  );
};

export default TeamsPage;
