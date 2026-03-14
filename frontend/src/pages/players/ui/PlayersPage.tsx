import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "@/shared/api/client";
import { PlayerCard } from "@/shared/ui/PlayerCard";
import { Search, Filter, Users } from "lucide-react";

export default function PlayersPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const data = await apiRequest<any[]>("/players");
      setPlayers(data);
    } catch (err) {
      console.error("Ошибка загрузки игроков:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(player => 
    `${player.first_name} ${player.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="p-3 bg-orange-500 rounded-2xl">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white">Игроки NBA</h1>
            <p className="text-slate-400">Просмотр и анализ статистики игроков</p>
          </div>
        </motion.div>

        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Поиск игрока..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-white w-full md:w-64 focus:outline-none focus:border-orange-500 transition-all"
            />
          </div>
          <button className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map((player, index) => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                delay={index * 0.05} 
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-slate-500 text-lg">Игроки не найдены</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
