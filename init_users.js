const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function initDisplayIds() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${users.length} users to process...`);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    // Generate new 2-digit format ID: [Random4]-[Seq2]
    const random4 = Math.floor(1000 + Math.random() * 9000);
    const sequence = (i + 1).toString().padStart(2, '0');
    const displayId = `${random4}-${sequence}`;
    
    await prisma.user.update({
      where: { id: user.id },
      data: { displayId }
    });
    console.log(`✓ Updated user [${user.username}] -> ${displayId}`);
  }
}

initDisplayIds()
  .then(() => console.log("All users successfully updated."))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
