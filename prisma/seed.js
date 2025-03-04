const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { faker } = require("@faker-js/faker");

async function main() {
    console.log("Seeding database...");

    // Create test users
    for (let i = 0; i < 5; i++) {
        await prisma.user.create({
            data: {
                email: faker.internet.email(),
                passwordHash: faker.internet.password(),
            },
        });
    }

    console.log("Database seeded successfully!");
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
