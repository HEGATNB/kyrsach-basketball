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
    // Временно используем тестовые данные, так как API /players не работает
    setTimeout(() => {
      setPlayers([]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredPlayers = players.filter(player =>
    `${player.first_name} ${player.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

      <div className="text-center py-20">
        <p className="text-slate-500 text-lg">API игроков временно недоступно</p>
        <p className="text-slate-600 text-sm mt-2">Раздел в разработке</p>
      </div>
    </div>
  );
}