# Многоэтапная сборка для Next.js приложения с nginx
FROM node:18-alpine AS base

# Установка зависимостей только для сборки
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Копируем файлы зависимостей
COPY package.json package-lock.json* ./
RUN npm ci

# Этап сборки
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Проверяем, что @tailwindcss/postcss установлен
RUN npm list @tailwindcss/postcss || npm install @tailwindcss/postcss

# Генерируем Prisma клиент
RUN npx prisma generate

# Собираем приложение
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Продакшн зависимости
FROM base AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Продакшн этап с nginx
FROM nginx:alpine AS runner
WORKDIR /app

# Устанавливаем Node.js и Prisma CLI для запуска Next.js сервера
RUN apk add --no-cache nodejs npm
RUN npm install -g prisma

# Копируем собранное приложение
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Копируем public папку из исходного кода
COPY --from=builder /app/public ./public

# Копируем Prisma схему
COPY --from=builder /app/prisma ./prisma

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Создаем пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Создаем скрипт запуска прямо в Dockerfile
RUN echo '#!/bin/sh' > start.sh && \
    echo 'echo "🚀 Запуск Unimark Client..."' >> start.sh && \
    echo 'echo "📦 Генерируем Prisma клиент..."' >> start.sh && \
    echo 'npx prisma generate' >> start.sh && \
    echo 'echo "🔍 Проверяем подключение к базе данных..."' >> start.sh && \
    echo 'npx prisma db push --accept-data-loss || {' >> start.sh && \
    echo '    echo "❌ Ошибка подключения к базе данных. Проверьте DATABASE_URL"' >> start.sh && \
    echo '    exit 1' >> start.sh && \
    echo '}' >> start.sh && \
    echo 'echo "🌐 Запускаем nginx..."' >> start.sh && \
    echo 'nginx -g "daemon on;" &' >> start.sh && \
    echo 'echo "⚡ Запускаем Next.js приложение..."' >> start.sh && \
    echo 'if [ -f "server.js" ]; then' >> start.sh && \
    echo '    exec node server.js' >> start.sh && \
    echo 'else' >> start.sh && \
    echo '    echo "❌ Файл server.js не найден в standalone сборке"' >> start.sh && \
    echo '    exit 1' >> start.sh && \
    echo 'fi' >> start.sh && \
    chmod +x start.sh

# Устанавливаем права доступа
RUN chown -R nextjs:nodejs /app

# Открываем порты
EXPOSE 3000 80

# Запускаем приложение
CMD ["./start.sh"]
