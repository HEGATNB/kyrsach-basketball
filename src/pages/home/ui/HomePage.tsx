import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { TrendingUp, Activity, Target, Calendar } from "lucide-react";

// Фейковые данные для графиков (выглядят умно)
const dataAccuracy = [
  { name: 'Янв', acc: 65 },
  { name: 'Фев', acc: 72 },
  { name: 'Мар', acc: 68 },
  { name: 'Апр', acc: 75 },
  { name: 'Май', acc: 82 },
  { name: 'Июн', acc: 88 },
];

const dataActivity = [
  { day: 'Пн', predictions: 12 },
  { day: 'Вт', predictions: 18 },
  { day: 'Ср', predictions: 8 },
  { day: 'Чт', predictions: 24 },
  { day: 'Пт', predictions: 32 },
  { day: 'Сб', predictions: 45 },
  { day: 'Вс', predictions: 20 },
];

export function HomePage() {
  return (
    <section>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", margin: "0 0 0.5rem 0" }}>Обзор системы</h1>
        <p className="text-muted">Аналитика производительности моделей и активность пользователей</p>
      </div>

      {/* KPI CARDS - Верхние карточки */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", 
        gap: "1.5rem", 
        marginBottom: "2rem" 
      }}>
        <KpiCard title="Точность модели" value="82.4%" trend="+4.5%" icon={<Target size={24} color="#3b82f6" />} />
        <KpiCard title="Всего прогнозов" value="1,248" trend="+12%" icon={<Activity size={24} color="#10b981" />} />
        <KpiCard title="Активные матчи" value="4" sub="Сегодня" icon={<Calendar size={24} color="#f59e0b" />} />
        <KpiCard title="ROI (Прибыль)" value="+18%" trend="Стабильно" icon={<TrendingUp size={24} color="#8b5cf6" />} />
      </div>

      {/* CHARTS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        
        {/* График 1: Точность модели (Area Chart) */}
        <div className="card" style={{ height: 350, display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: "0 0 1.5rem 0" }}>Динамика точности AI</h3>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataAccuracy}>
                <defs>
                  <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} 
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="acc" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAcc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* График 2: Активность (Bar Chart) */}
        <div className="card" style={{ height: 350, display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: "0 0 1.5rem 0" }}>Активность за неделю</h3>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataActivity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                />
                <Bar dataKey="predictions" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </section>
  );
}

// Мини-компонент для KPI карточки
function KpiCard({ title, value, trend, sub, icon }: any) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: 4 }}>{value}</div>
        {(trend || sub) && (
          <div style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6 }}>
            {trend && <span style={{ color: "var(--success)", fontWeight: 600 }}>{trend}</span>}
            {sub && <span style={{ color: "var(--text-muted)" }}>{sub}</span>}
          </div>
        )}
      </div>
      <div style={{ padding: 10, background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
        {icon}
      </div>
    </div>
  );
}
