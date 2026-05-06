const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const assignment = await prisma.assignment.findFirst({
    include: { file: true, user: true }
  });
  if (assignment) {
    console.log("ID:", assignment.id);
    console.log("File:", assignment.file.filename);
    console.log("User:", assignment.user.username);
  } else {
    console.log("No assignments found.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
