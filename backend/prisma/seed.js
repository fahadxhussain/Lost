const { PrismaClient } = require('@prisma/client');
const { INITIAL_CATEGORIES } = require('../src/constants/categories');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Categories ---');
  for (const cat of INITIAL_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon },
      create: { name: cat.name, slug: cat.slug, icon: cat.icon },
    });
  }
  console.log(`Successfully seeded ${INITIAL_CATEGORIES.length} categories.`);
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
