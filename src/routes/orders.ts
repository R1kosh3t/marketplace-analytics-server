import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();
router.use(authMiddleware);

router.post('/sync', async (req: AuthRequest, res: Response) => {
  const { marketplace, orders } = req.body;
  if (!marketplace || !Array.isArray(orders)) {
    return res.status(400).json({ error: 'Неверный формат данных' });
  }

  try {
    // Найдём привязанный аккаунт пользователя для этого маркетплейса
    const account = await prisma.userMarketplaceAccount.findFirst({
      where: {
        userId: req.userId!,
        marketplace: { name: marketplace }
      },
      include: { marketplace: true }
    });
    if (!account) {
      return res.status(400).json({ error: 'Аккаунт маркетплейса не привязан' });
    }

    let created = 0;
    for (const order of orders) {
      // Проверяем, нет ли уже такого заказа
      const existing = await prisma.order.findUnique({
        where: {
          marketplaceAccountId_externalOrderId: {
            marketplaceAccountId: account.id,
            externalOrderId: order.externalOrderId
          }
        }
      });
      if (existing) continue;

      await prisma.order.create({
        data: {
          externalOrderId: order.externalOrderId,
          orderDate: new Date(order.date),
          totalAmount: order.total,
          currency: 'BYN',
          marketplaceAccountId: account.id,
          items: {
            create: order.items.map((item: any) => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity
            }))
          }
        }
      });
      created++;
    }

    res.json({ created, message: `Добавлено ${created} новых заказов` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;