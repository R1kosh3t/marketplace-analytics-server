import { defineConfig } from 'prisma/config'

export default defineConfig({
  // Указываем путь к файлу схемы
  schema: 'prisma/schema.prisma',
  // Настройки для миграций
  migrations: {
    path: 'prisma/migrations',
  },
  // Настройки подключения к базе данных
  datasource: {
    url: 'file:./dev.db', // Путь к файлу SQLite
  },
})