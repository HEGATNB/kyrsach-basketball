import { motion } from 'framer-motion';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { GlowingCard } from './GlowingCard';

// Цвета для графиков
const COLORS = ['#c96a2b', '#607d96', '#728b74', '#d8b46a', '#8d6b5d', '#56786f'];

interface ChartProps {
  title?: string;
  data: any[];
  className?: string;
}

// Линейный график (тренды)
export const LineChartComponent = ({ 
  title, data, dataKey, xAxisKey, color = '#c96a2b', className = '' 
}: ChartProps & { 
  dataKey: string; 
  xAxisKey: string;
  color?: string;
}) => {
  return (
    <GlowingCard className={`p-6 ${className}`}>
      {title && <h3 className="text-lg font-bold text-white mb-4">{title}</h3>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{ backgroundColor: '#161d26', border: '1px solid rgba(244,233,215,0.1)', borderRadius: 16 }}
              labelStyle={{ color: '#f5efe4' }}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ fill: color }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlowingCard>
  );
};

// Столбчатая диаграмма
export const BarChartComponent = ({ 
  title, data, dataKey, xAxisKey, className = '' 
}: ChartProps & { 
  dataKey: string; 
  xAxisKey: string;
}) => {
  return (
    <GlowingCard className={`p-6 ${className}`}>
      {title && <h3 className="text-lg font-bold text-white mb-4">{title}</h3>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{ backgroundColor: '#161d26', border: '1px solid rgba(244,233,215,0.1)', borderRadius: 16 }}
              labelStyle={{ color: '#f5efe4' }}
            />
            <Bar dataKey={dataKey} fill="#c96a2b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlowingCard>
  );
};

// Круговая диаграмма
export const PieChartComponent = ({ 
  title, data, nameKey, valueKey, className = '' 
}: ChartProps & { 
  nameKey: string; 
  valueKey: string;
}) => {
  return (
    <GlowingCard className={`p-6 ${className}`}>
      {title && <h3 className="text-lg font-bold text-white mb-4">{title}</h3>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: any) => `${entry[nameKey]}: ${entry[valueKey]}%`}
              outerRadius={80}
              fill="#607d96"
              dataKey={valueKey}
            >
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#161d26', border: '1px solid rgba(244,233,215,0.1)', borderRadius: 16 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </GlowingCard>
  );
};

// Радарная диаграмма (для сравнения команд)
export const RadarChartComponent = ({ 
  title, data, dataKeys, className = '' 
}: ChartProps & {
  dataKeys: string[];
}) => {
  return (
    <GlowingCard className={`p-6 ${className}`}>
      {title && <h3 className="text-lg font-bold text-white mb-4">{title}</h3>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="metric" stroke="#94a3b8" />
            <PolarRadiusAxis stroke="#334155" />
            {dataKeys.map((key, index) => (
              <Radar
                key={key}
                name={key}
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.3}
              />
            ))}
            <Legend />
            <Tooltip
              contentStyle={{ backgroundColor: '#161d26', border: '1px solid rgba(244,233,215,0.1)', borderRadius: 16 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </GlowingCard>
  );
};

// Прогресс-бар с анимацией
export const ProgressBar = ({ 
  value, 
  max = 100, 
  color = '#c96a2b',
  label
}: { value: number; max?: number; color?: string; label?: string }) => {
  const percentage = (value / max) * 100;
  
  return (
    <div className="space-y-1 w-full">
      {label && <p className="text-sm text-slate-400">{label}</p>}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden w-full">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
};
