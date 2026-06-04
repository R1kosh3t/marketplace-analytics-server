const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.marketplace.upsert({
    where: { name: 'e-dostavka' },
    update: {},
    create: { name: 'e-dostavka', url: 'https://e-dostavka.by' },
  });
  await prisma.marketplace.upsert({
    where: { name: '5element' },
    update: {},
    create: { name: '5element', url: 'https://5element.by' },
  });
  console.log('Маркетплейсы добавлены');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());