import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { teamsMock } from "@/entities/team";
import { calculatePrediction } from "@/entities/prediction";

export function PredictionNewPage() {
  const navigate = useNavigate();
  const [team1Id, setTeam1Id] = useState<string>("");
  const [team2Id, setTeam2Id] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePredict = async () => {
    if (!team1Id || !team2Id || team1Id === team2Id) {
      alert("Выберите две разные команды");
      return;
    }

    setIsLoading(true);
    try {
      // Вызываем "AI"
      const result = await calculatePrediction(Number(team1Id), Number(team2Id));
      
      // Сохраняем результат в localStorage (чтобы показать на след. странице без бэкенда)
      const history = JSON.parse(localStorage.getItem("predictions") || "[]");
      history.push(result);
      localStorage.setItem("predictions", JSON.stringify(history));

      // Переходим на страницу результата (создадим её следующим шагом)
      navigate(`/prediction/${result.id}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section style={{ maxWidth: 500 }}>
      <h1>Новый прогноз</h1>
      <p>Выберите команды для анализа матча</p>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <select 
          value={team1Id} 
          onChange={(e) => setTeam1Id(e.target.value)}
          style={{ padding: 8, width: "100%" }}
        >
          <option value="">Команда 1</option>
          {teamsMock.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <span style={{ alignSelf: "center" }}>VS</span>

        <select 
          value={team2Id} 
          onChange={(e) => setTeam2Id(e.target.value)}
          style={{ padding: 8, width: "100%" }}
        >
          <option value="">Команда 2</option>
          {teamsMock.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <button 
        onClick={handlePredict} 
        disabled={isLoading}
        style={{ padding: "10px 20px", cursor: isLoading ? "wait" : "pointer" }}
      >
        {isLoading ? "Анализирую..." : "Рассчитать прогноз"}
      </button>
    </section>
  );
}
