import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// Все маршруты требуют авторизации
router.use(authMiddleware);

// Получить список доступных маркетплейсов (из базы)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const marketplaces = await prisma.marketplace.findMany();
    res.json(marketplaces);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Привязать аккаунт маркетплейса
router.post('/link', async (req: AuthRequest, res: Response) => {
  const { marketplaceId, externalId } = req.body;
  if (!marketplaceId || !externalId) {
    return res.status(400).json({ error: 'marketplaceId и externalId обязательны' });
  }
  try {
    // Проверяем, существует ли такой маркетплейс
    const mp = await prisma.marketplace.findUnique({ where: { id: marketplaceId } });
    if (!mp) {
      return res.status(404).json({ error: 'Маркетплейс не найден' });
    }
    // Создаем или обновляем связь
    const account = await prisma.userMarketplaceAccount.upsert({
      where: {
        userId_marketplaceId: {
          userId: req.userId!,
          marketplaceId,
        },
      },
      update: { externalId },
      create: {
        userId: req.userId!,
        marketplaceId,
        externalId,
      },
    });
    res.json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить привязанные аккаунты пользователя
router.get('/accounts', async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await prisma.userMarketplaceAccount.findMany({
      where: { userId: req.userId! },
      include: { marketplace: true },
    });
    res.json(accounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/unlink', async (req: AuthRequest, res: Response) => {
  const { marketplaceId } = req.body;
  if (!marketplaceId) {
    return res.status(400).json({ error: 'marketplaceId обязателен' });
  }

  try {
    // 1. Находим аккаунт пользователя для этого маркетплейса
    const account = await prisma.userMarketplaceAccount.findFirst({
      where: {
        userId: req.userId!,
        marketplaceId: marketplaceId,
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Привязка не найдена' });
    }

    // 2. Удаляем все позиции заказов (OrderItem), связанные с заказами этого аккаунта
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          marketplaceAccountId: account.id,
        },
      },
    });

    // 3. Удаляем сами заказы
    await prisma.order.deleteMany({
      where: { marketplaceAccountId: account.id },
    });

    // 4. Удаляем привязку аккаунта
    await prisma.userMarketplaceAccount.delete({
      where: { id: account.id },
    });

    res.json({ success: true, message: 'Привязка и все связанные данные удалены' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;