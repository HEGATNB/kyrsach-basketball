import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { dbLogs, createBackup, restoreBackup, AuditLog, dbUsers } from "@/shared/api/db";
import { useNavigate } from "react-router-dom";

export function AdminPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [backupJson, setBackupJson] = useState("");
  const [activeTab, setActiveTab] = useState<"logs" | "backup">("logs");

  // Защита роута (если не админ - кидаем на главную)
  useEffect(() => {
    if (user && !isAdmin) {
      navigate("/");
    }
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    // Загружаем логи при открытии
    setLogs(dbLogs.getAll());
  }, []);

  const handleCreateBackup = () => {
    const json = createBackup();
    // Эмуляция скачивания файла
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleRestore = () => {
    if (!backupJson) return alert("Вставьте JSON!");
    if (!user) return;
    
    if (window.confirm("Это перезапишет текущую базу! Уверены?")) {
      const ok = restoreBackup(backupJson, user);
      if (ok) {
        alert("Бэкап восстановлен! Страница перезагрузится.");
        window.location.reload();
      } else {
        alert("Ошибка формата JSON");
      }
    }
  };

  if (!isAdmin) return null; // Пока редирект не сработал

  return (
    <section>
      <h1>Панель администратора</h1>
      
      <div style={{ marginBottom: 20, borderBottom: "1px solid #ddd" }}>
        <button 
          onClick={() => setActiveTab("logs")}
          style={{ 
            marginRight: 10, 
            background: activeTab === "logs" ? "#333" : "transparent",
            color: activeTab === "logs" ? "#fff" : "#333"
          }}
        >
          Журнал действий
        </button>
        <button 
          onClick={() => setActiveTab("backup")}
          style={{ 
            background: activeTab === "backup" ? "#333" : "transparent",
            color: activeTab === "backup" ? "#fff" : "#333"
          }}
        >
          Резервное копирование
        </button>
      </div>

      {activeTab === "logs" && (
        <div>
          <h3>Аудит системы (последние действия)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
            <thead>
              <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                <th style={{ padding: 8 }}>Дата</th>
                <th style={{ padding: 8 }}>User</th>
                <th style={{ padding: 8 }}>Действие</th>
                <th style={{ padding: 8 }}>Сущность</th>
                <th style={{ padding: 8 }}>Детали</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{new Date(log.timestamp).toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{log.userEmail}</td>
                  <td style={{ padding: 8 }}>{log.action}</td>
                  <td style={{ padding: 8 }}>{log.entity}</td>
                  <td style={{ padding: 8, color: "#555" }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <p>Журнал пуст</p>}
        </div>
      )}

      {activeTab === "backup" && (
        <div style={{ maxWidth: 600 }}>
          <h3>Создание резервной копии</h3>
          <p>Скачать полный дамп базы данных (пользователи, команды, матчи, логи) в JSON.</p>
          <button onClick={handleCreateBackup} style={{ background: "green" }}>
            Скачать Backup (.json)
          </button>

          <h3 style={{ marginTop: 40 }}>Восстановление</h3>
          <p style={{ color: "red", fontWeight: "bold" }}>Внимание! Текущие данные будут удалены.</p>
          <textarea 
            rows={5} 
            placeholder="Вставьте содержимое backup.json сюда..." 
            value={backupJson}
            onChange={e => setBackupJson(e.target.value)}
            style={{ width: "100%", marginBottom: 10, padding: 8 }}
          />
          <button onClick={handleRestore} style={{ background: "red" }}>
            Восстановить из текста
          </button>
        </div>
      )}
    </section>
  );
}
