import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();
router.use(authMiddleware);

router.post('/sync', async (req: AuthRequest, res: Response) => {
  const { marketplace, items, total, date } = req.body;
  if (!marketplace || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Неверный формат данных' });
  }

  try {
    const account = await prisma.userMarketplaceAccount.findFirst({
      where: {
        userId: req.userId!,
        marketplace: { name: marketplace },
      },
      include: { marketplace: true },
    });
    if (!account) {
      return res.status(400).json({ error: 'Аккаунт маркетплейса не привязан' });
    }

    console.log('=== НАЧАЛО СИНХРОНИЗАЦИИ ===');
    console.log('Маркетплейс:', marketplace);
    console.log('Количество заказов до:', await prisma.order.count({ where: { status: 'cart' } }));

    // Создаём «отпечаток» корзины для сравнения
    const newFingerprint = JSON.stringify(
      items.map((item: any) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })).sort((a, b) => a.name.localeCompare(b.name))
    );

    console.log('Количество заказов после:', await prisma.order.count({ where: { status: 'cart' } }));
    console.log('=== КОНЕЦ СИНХРОНИЗАЦИИ ===');

    // Ищем последний сохранённый заказ для этого аккаунта
    const lastOrder = await prisma.order.findFirst({
      where: {
        marketplaceAccountId: account.id,
        status: 'cart',
      },
      include: { items: true },
      orderBy: { orderDate: 'desc' },
    });

    // Считаем отпечаток последней корзины, если она есть
    let lastFingerprint = null;
    if (lastOrder) {
      lastFingerprint = JSON.stringify(
        lastOrder.items.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })).sort((a, b) => a.name.localeCompare(b.name))
      );
    }

    // Если состав не изменился — просто обновляем дату последнего заказа
    if (lastOrder && newFingerprint === lastFingerprint) {
      await prisma.order.update({
        where: { id: lastOrder.id },
        data: { orderDate: new Date(date) },
      });
      return res.json({ updated: true, orderId: lastOrder.id, message: 'Дата корзины обновлена' });
    }

    // Иначе создаём новый заказ (состав изменился)
    const order = await prisma.order.create({
      data: {
        externalOrderId: `cart-${Date.now()}`,
        orderDate: new Date(date),
        totalAmount: total,
        currency: 'BYN',
        status: 'cart',
        marketplaceAccountId: account.id,
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
    });

    res.json({ created: true, orderId: order.id, message: 'Корзина сохранена' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 1. История корзин (последние 20 записей)
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        account: {
          userId: req.userId!,
        },
        status: 'cart',
      },
      include: {
        items: true,
        account: {
          include: {
            marketplace: true,
          },
        },
      },
      orderBy: { orderDate: 'desc' },
      take: 20,
    });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 2. Статистика для графика и топ товаров
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        account: {
          userId: req.userId!,
        },
        status: 'cart',
      },
      include: {
        items: true,
        account: {
          include: {
            marketplace: true,
          },
        },
      },
    });

    const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const averageCheck = orders.length ? totalSpent / orders.length : 0;
    const count = orders.length;

    // Топ-5 товаров (по количеству)
    const itemCounts: Record<string, { name: string; count: number }> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!itemCounts[item.name]) itemCounts[item.name] = { name: item.name, count: 0 };
        itemCounts[item.name].count += item.quantity;
      });
    });
    const topItems = Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Данные для графика (расходы по дням)
    const spendByDate: Record<string, number> = {};
    orders.forEach(order => {
      const date = order.orderDate.toISOString().split('T')[0];
      spendByDate[date] = (spendByDate[date] || 0) + order.totalAmount;
    });
    const chartData = Object.entries(spendByDate)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Распределение по маркетплейсам (исправлено!)
    const spendByMarketplace: Record<string, number> = {};
    orders.forEach(order => {
      const mpName = order.account.marketplace.name;
      spendByMarketplace[mpName] = (spendByMarketplace[mpName] || 0) + order.totalAmount;
    });

    const displayNames: Record<string, string> = {
      'e-dostavka': 'Е-доставка',
      '5element': '5 Элемент',
      '21vek': '21vek.by',
      'onliner': 'Onliner',
    };

    const marketplaceDistribution = Object.entries(spendByMarketplace).map(([name, amount]) => ({
      name: displayNames[name] || name,
      amount,
    }));

    res.json({
      totalSpent,
      averageCheck,
      count,
      topItems,
      chartData,
      marketplaceDistribution,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 3. Сравнение выбранных корзин
router.post('/compare', async (req: AuthRequest, res: Response) => {
  const { orderIds } = req.body;
  if (!Array.isArray(orderIds) || orderIds.length < 2) {
    return res.status(400).json({ error: 'Нужно минимум два ID заказов' });
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        account: { userId: req.userId! },
        status: 'cart',
      },
      include: {
        items: true,
        account: { include: { marketplace: true } },
      },
    });

    if (orders.length < 2) {
      return res.status(400).json({ error: 'Найдено недостаточно заказов' });
    }

    // Собираем сводку по товарам: для каждого товара храним массив { orderId, quantity, price }
    const itemMap: Record<string, {
      name: string;
      appearances: { orderId: string; date: string; quantity: number; price: number }[];
    }> = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        if (!itemMap[item.name]) {
          itemMap[item.name] = { name: item.name, appearances: [] };
        }
        itemMap[item.name].appearances.push({
          orderId: order.id,
          date: order.orderDate.toISOString().split('T')[0],
          quantity: item.quantity,
          price: item.price,
        });
      });
    });

    // Определяем, в скольких заказах присутствует товар
    const allItems = Object.values(itemMap).map(item => ({
      name: item.name,
      presentIn: item.appearances.length,
      totalOrders: orders.length,
      details: item.appearances,
    }));

    // Сортируем: сначала товары, которые есть не во всех корзинах (изменения), потом стабильные
    allItems.sort((a, b) => a.presentIn - b.presentIn);

    res.json({
      orders: orders.map(o => ({
        id: o.id,
        date: o.orderDate.toISOString().split('T')[0],
        marketplace: o.account.marketplace.name,
        totalAmount: o.totalAmount,
        itemCount: o.items.length,
      })),
      items: allItems,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;