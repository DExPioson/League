import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);

  // Admin
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@footballleague.com' },
    update: { passwordHash: adminHash },
    create: {
      name: 'Admin',
      email: 'admin@footballleague.com',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  // Season
  const season = await prisma.season.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Friends Football League 2026',
      budgetPerCaptain: 100000,
      transferLimit: 2,
      status: 'ACTIVE',
    },
  });

  // 3 Captains
  const captainData = [
    { name: 'Captain Alpha', email: 'captain1@footballleague.com', teamName: 'Blue Warriors' },
    { name: 'Captain Bravo', email: 'captain2@footballleague.com', teamName: 'Red Titans' },
    { name: 'Captain Charlie', email: 'captain3@footballleague.com', teamName: 'Green Eagles' },
  ];

  for (const c of captainData) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: { name: c.name, email: c.email, passwordHash: hash, role: 'CAPTAIN' },
    });

    const existing = await prisma.captain.findUnique({ where: { userId: user.id } });
    if (!existing) {
      const captain = await prisma.captain.create({
        data: {
          userId: user.id,
          seasonId: season.id,
          startingBudget: season.budgetPerCaptain,
          remainingBudget: season.budgetPerCaptain,
        },
      });
      await prisma.team.create({
        data: { seasonId: season.id, captainId: captain.id, name: c.teamName },
      });
    }
  }

  // 1 Player user
  const playerUser = await prisma.user.upsert({
    where: { email: 'player1@footballleague.com' },
    update: {},
    create: { name: 'Rahul Sharma', email: 'player1@footballleague.com', passwordHash: hash, role: 'PLAYER' },
  });

  // Seed 15 players into the season
  const playerNames = [
    { name: 'Rahul Sharma', position: 'Forward', basePrice: 8000, rating: 8.5, age: 22 },
    { name: 'Amit Patel', position: 'Forward', basePrice: 7000, rating: 7.5, age: 24 },
    { name: 'Vikram Singh', position: 'Midfielder', basePrice: 6000, rating: 8.0, age: 23 },
    { name: 'Rohan Gupta', position: 'Midfielder', basePrice: 5500, rating: 7.0, age: 25 },
    { name: 'Suresh Kumar', position: 'Midfielder', basePrice: 5000, rating: 6.5, age: 21 },
    { name: 'Pradeep Yadav', position: 'Defender', basePrice: 4500, rating: 7.5, age: 26 },
    { name: 'Manoj Tiwari', position: 'Defender', basePrice: 4000, rating: 7.0, age: 24 },
    { name: 'Deepak Nair', position: 'Defender', basePrice: 4500, rating: 6.5, age: 22 },
    { name: 'Karan Mehta', position: 'Goalkeeper', basePrice: 6000, rating: 8.0, age: 27 },
    { name: 'Arjun Reddy', position: 'Forward', basePrice: 7500, rating: 8.5, age: 23 },
    { name: 'Nikhil Joshi', position: 'Midfielder', basePrice: 5000, rating: 7.0, age: 20 },
    { name: 'Sanjay Verma', position: 'Defender', basePrice: 3500, rating: 6.0, age: 28 },
    { name: 'Ravi Shankar', position: 'Forward', basePrice: 6500, rating: 7.5, age: 22 },
    { name: 'Aakash Chopra', position: 'Goalkeeper', basePrice: 5500, rating: 7.5, age: 25 },
    { name: 'Tarun Mishra', position: 'Midfielder', basePrice: 4000, rating: 6.5, age: 21 },
  ];

  for (const p of playerNames) {
    const exists = await prisma.player.findFirst({
      where: { name: p.name, seasonId: season.id },
    });
    if (!exists) {
      await prisma.player.create({
        data: {
          ...p,
          seasonId: season.id,
          preferredFoot: 'Right',
          userId: p.name === 'Rahul Sharma' ? playerUser.id : undefined,
        },
      });
    }
  }

  console.log('✅ Seed complete!');
  console.log('');
  console.log('=== Login Credentials ===');
  console.log('Admin:    admin@footballleague.com / admin123');
  console.log('Captain1: captain1@footballleague.com / password123');
  console.log('Captain2: captain2@footballleague.com / password123');
  console.log('Captain3: captain3@footballleague.com / password123');
  console.log('Player:   player1@footballleague.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
