# Stage 1: Сборка и запуск проекта
FROM node:18-alpine as builder

WORKDIR /app

# Копируем фронтенд
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Создание итогового образа

FROM nginx:alpine

# Удаляем дефолтный конфиг

RUN rm /etc/nginx/conf.d/default.conf

# Копируем наш конфиг nginx

COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранный фронтенд

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]