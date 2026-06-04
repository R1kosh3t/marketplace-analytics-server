-- Пятница (23 мая) – Евроопт
INSERT INTO "Order" (id, externalOrderId, orderDate, totalAmount, currency, status, marketplaceAccountId)
SELECT lower(hex(randomblob(16))), 'cart-' || abs(random()), '2026-05-23 10:00:00', totalAmount, currency, 'cart', marketplaceAccountId
FROM "Order" WHERE marketplaceAccountId IN (SELECT id FROM UserMarketplaceAccount WHERE marketplaceId = (SELECT id FROM Marketplace WHERE name = 'e-dostavka'))
ORDER BY orderDate DESC LIMIT 1;

INSERT INTO OrderItem (id, orderId, name, price, quantity)
SELECT lower(hex(randomblob(16))), (SELECT id FROM "Order" ORDER BY orderDate DESC LIMIT 1), name, price, quantity
FROM OrderItem WHERE orderId = (SELECT id FROM "Order" WHERE marketplaceAccountId IN (SELECT id FROM UserMarketplaceAccount WHERE marketplaceId = (SELECT id FROM Marketplace WHERE name = 'e-dostavka')) ORDER BY orderDate DESC LIMIT 1 OFFSET 1);

-- Суббота (24 мая) – 5 Элемент
INSERT INTO "Order" (id, externalOrderId, orderDate, totalAmount, currency, status, marketplaceAccountId)
SELECT lower(hex(randomblob(16))), 'cart-' || abs(random()), '2026-05-24 10:00:00', totalAmount, currency, 'cart', marketplaceAccountId
FROM "Order" WHERE marketplaceAccountId IN (SELECT id FROM UserMarketplaceAccount WHERE marketplaceId = (SELECT id FROM Marketplace WHERE name = '5element'))
ORDER BY orderDate DESC LIMIT 1;

INSERT INTO OrderItem (id, orderId, name, price, quantity)
SELECT lower(hex(randomblob(16))), (SELECT id FROM "Order" ORDER BY orderDate DESC LIMIT 1), name, price, quantity
FROM OrderItem WHERE orderId = (SELECT id FROM "Order" WHERE marketplaceAccountId IN (SELECT id FROM UserMarketplaceAccount WHERE marketplaceId = (SELECT id FROM Marketplace WHERE name = '5element')) ORDER BY orderDate DESC LIMIT 1 OFFSET 1);

-- Воскресенье (25 мая) – 21vek
INSERT INTO "Order" (id, externalOrderId, orderDate, totalAmount, currency, status, marketplaceAccountId)
SELECT lower(hex(randomblob(16))), 'cart-' || abs(random()), '2026-05-25 10:00:00', totalAmount, currency, 'cart', marketplaceAccountId
FROM "Order" WHERE marketplaceAccountId IN (SELECT id FROM UserMarketplaceAccount WHERE marketplaceId = (SELECT id FROM Marketplace WHERE name = '21vek'))
ORDER BY orderDate DESC LIMIT 1;

INSERT INTO OrderItem (id, orderId, name, price, quantity)
SELECT lower(hex(randomblob(16))), (SELECT id FROM "Order" ORDER BY orderDate DESC LIMIT 1), name, price, quantity
FROM OrderItem WHERE orderId = (SELECT id FROM "Order" WHERE marketplaceAccountId IN (SELECT id FROM UserMarketplaceAccount WHERE marketplaceId = (SELECT id FROM Marketplace WHERE name = '21vek')) ORDER BY orderDate DESC LIMIT 1 OFFSET 1);