import { motion } from "framer-motion";
import { User, Target, BarChart3, Info } from "lucide-react";
import { GlowingCard } from "./GlowingCard";

interface PlayerCardProps {
  player: {
    id: number;
    first_name: string;
    last_name: string;
    number?: number;
    position?: string;
    height?: string;
    weight?: number;
    points_per_game: number;
    rebounds_per_game: number;
    assists_per_game: number;
    image_url?: string;
  };
  delay?: number;
}

export function PlayerCard({ player, delay = 0 }: PlayerCardProps) {
  const defaultImage = "https://www.nba.com/assets/logos/teams/primary/web/NBA.svg";

  return (
    <GlowingCard glowColor="blue" delay={delay} className="group h-full">
      <div className="relative mb-6 -mx-6 -mt-6 h-48 overflow-hidden rounded-t-2xl">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10" />
        <img
          src={player.image_url || defaultImage}
          alt={`${player.first_name} ${player.last_name}`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultImage;
          }}
        />
        <div className="absolute bottom-4 left-6 z-20">
          <div className="flex items-center gap-2">
            <span className="text-4xl font-black text-white leading-none">
              #{player.number || "00"}
            </span>
            <div className="h-8 w-1 bg-orange-500 rounded-full" />
            <div>
              <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">
                {player.position || "Player"}
              </p>
              <h3 className="text-xl font-bold text-white leading-none">
                {player.first_name[0]}. {player.last_name}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="text-center p-2 rounded-xl bg-slate-800/50">
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">PTS</p>
          <p className="text-lg font-black text-white">{player.points_per_game.toFixed(1)}</p>
        </div>
        <div className="text-center p-2 rounded-xl bg-slate-800/50">
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">REB</p>
          <p className="text-lg font-black text-white">{player.rebounds_per_game.toFixed(1)}</p>
        </div>
        <div className="text-center p-2 rounded-xl bg-slate-800/50">
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">AST</p>
          <p className="text-lg font-black text-white">{player.assists_per_game.toFixed(1)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <Info className="w-4 h-4" />
            <span>Рост/Вес</span>
          </div>
          <span className="text-white font-medium">
            {player.height || "N/A"} / {player.weight ? `${player.weight} кг` : "N/A"}
          </span>
        </div>
        <div className="w-full h-px bg-slate-800" />
        <button className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm font-bold flex items-center justify-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Полная статистика
        </button>
      </div>
    </GlowingCard>
  );
}
