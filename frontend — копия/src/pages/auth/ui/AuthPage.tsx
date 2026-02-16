import React from 'react';

export const AuthPage = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">Вход в систему</h2>
        <div className="space-y-3 text-sm text-slate-300">
          <p>Здесь уже подключен твой реальный бэкенд с Prisma и JWT.</p>
          <p>Форму можно оформить в том же стиле, что и главную.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
