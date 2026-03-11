FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "npm run prisma:generate && npm run db:migrate && npm run dev"]
