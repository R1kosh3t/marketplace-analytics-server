import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import marketplaceRoutes from './routes/marketplace';
import ordersRoutes from './routes/orders';
import prisma from './lib/prisma';
import cartRoutes from './routes/cart';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS разрешает запросы с расширения и localhost
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:3000'],
  credentials: true
}));

// Важно: парсинг JSON должен идти до маршрутов
app.use(express.json());
app.use('/api/cart', cartRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/marketplaces', marketplaceRoutes);
app.use('/api/orders', ordersRoutes);

// Автозаполнение маркетплейсов при старте
async function ensureMarketplaces() {
  const count = await prisma.marketplace.count();
  if (count === 0) {
    await prisma.marketplace.createMany({
      data: [
        { name: 'e-dostavka', url: 'https://e-dostavka.by' },
        { name: '5element', url: 'https://5element.by' },
        { name: '21vek', url: 'https://www.21vek.by' },
        { name: 'onliner', url: 'https://www.onliner.by' }
      ],
    });
    console.log('Маркетплейсы добавлены в базу');
  }
}


async function start() {
  // Включаем каскадное удаление в SQLite
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
  console.log('Внешние ключи включены');

  await ensureMarketplaces();

  app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
  });
}

start();
