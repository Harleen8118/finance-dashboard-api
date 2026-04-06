import { PrismaClient, Role, RecordType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const adminPassword = await bcrypt.hash('Admin1234!', 10);
  const analystPassword = await bcrypt.hash('Analyst1234!', 10);
  const viewerPassword = await bcrypt.hash('Viewer1234!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@finance.com' },
    update: {},
    create: {
      email: 'admin@finance.com',
      password: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  });

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@finance.com' },
    update: {},
    create: {
      email: 'analyst@finance.com',
      password: analystPassword,
      name: 'Analyst User',
      role: Role.ANALYST,
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@finance.com' },
    update: {},
    create: {
      email: 'viewer@finance.com',
      password: viewerPassword,
      name: 'Viewer User',
      role: Role.VIEWER,
    },
  });

  console.log('✅ Users created:', { admin: admin.email, analyst: analyst.email, viewer: viewer.email });

  // Create financial records
  const categories = ['Salary', 'Rent', 'Food', 'Utilities', 'Investment', 'Transport'];
  const users = [admin, analyst, viewer];
  const now = new Date();

  const records = [];
  for (let i = 0; i < 20; i++) {
    const type = i % 3 === 0 ? RecordType.INCOME : RecordType.EXPENSE;
    const category = categories[i % categories.length];
    const monthsAgo = Math.floor(Math.random() * 6);
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.floor(Math.random() * 28) + 1);
    const amount = type === RecordType.INCOME
      ? (Math.floor(Math.random() * 5000) + 1000)
      : (Math.floor(Math.random() * 1500) + 100);

    records.push({
      amount,
      type,
      category,
      date,
      description: `${type === RecordType.INCOME ? 'Income' : 'Expense'} - ${category} #${i + 1}`,
      userId: users[i % users.length].id,
    });
  }

  await prisma.financialRecord.createMany({ data: records });
  console.log(`✅ Created ${records.length} financial records`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
