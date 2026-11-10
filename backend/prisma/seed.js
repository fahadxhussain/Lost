const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Mobile Phone', slug: 'mobile-phone', icon: 'smartphone' },
  { name: 'Laptop Charger', slug: 'laptop-charger', icon: 'battery-charging' },
  { name: 'Laptops & Tablets', slug: 'laptops-tablets', icon: 'laptop' },
  { name: 'Student ID Card & Wallets', slug: 'student-id-wallets', icon: 'credit-card' },
  { name: 'USB & Electronic Accessories', slug: 'usb-electronics', icon: 'usb' },
  { name: 'Keys (Vehicle / Room)', slug: 'keys', icon: 'key' },
  { name: 'Documents & Notebooks', slug: 'documents-notebooks', icon: 'book' },
  { name: 'Glasses & Watches', slug: 'glasses-watches', icon: 'watch' },
  { name: 'Calculators & Stationary', slug: 'calculators-stationary', icon: 'edit-3' },
  { name: 'Water Bottles & Personal Items', slug: 'personal-items', icon: 'coffee' },
  { name: 'Other', slug: 'other', icon: 'help-circle' },
];

async function main() {
  console.log('--- Seeding Categories ---');
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon },
      create: { name: cat.name, slug: cat.slug, icon: cat.icon },
    });
  }
  console.log(`Successfully seeded ${CATEGORIES.length} categories.`);
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
