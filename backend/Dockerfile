FROM python:3.11-slim

WORKDIR /app

# Устанавливаем системные зависимости и сетевые утилиты
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    dnsutils \
    && rm -rf /var/lib/apt/lists/*

# Копируем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Копируем остальной код
COPY . .

# Создаем папки для моделей и бэкапов
RUN mkdir -p /app/models /app/backups

# Проверяем сеть при запуске
RUN echo "nameserver 8.8.8.8" >> /etc/resolv.conf

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]