const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { username: 'zawia' }
  });
  console.log("User:", user);
}

checkUser().catch(console.error).finally(() => prisma.$disconnect());
