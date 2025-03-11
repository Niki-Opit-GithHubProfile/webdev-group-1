const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create users
  await prisma.user.createMany({
    data: [
      { email: 'user1@example.com', passwordHash: 'hashedpassword1' },
      { email: 'user2@example.com', passwordHash: 'hashedpassword2' },
    ],
  });

  console.log('✅ Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
