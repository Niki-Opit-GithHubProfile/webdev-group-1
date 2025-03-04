const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConnection() {
    try {
        // Create a test user (only if the "User" model exists)
        const newUser = await prisma.user.create({
            data: {
                name: "Test User",
                email: `test${Date.now()}@example.com`, // Unique email
                password: "securepassword"
            }
        });

        console.log("User created:", newUser);

        // Fetch all users
        const users = await prisma.user.findMany();
        console.log("Users in DB:", users);
    } catch (error) {
        console.error("Error connecting to database:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
