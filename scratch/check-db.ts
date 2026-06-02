import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    take: 5,
    select: { id: true, companyName: true }
  });
  console.log("LEADS IN DB:", JSON.stringify(leads, null, 2));
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
