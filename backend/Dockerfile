FROM python:3.11-alpine

WORKDIR /app

# Устанавливаем системные зависимости для psycopg2
RUN apk add --no-cache postgresql-dev gcc python3-dev musl-dev

# Копируем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Копируем остальной код
COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]