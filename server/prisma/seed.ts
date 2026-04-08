import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@faceme.app" },
    update: {},
    create: {
      email: "admin@faceme.app",
      username: "facemeadmin",
      passwordHash,
      firstName: "FaceMe",
      lastName: "Admin",
      role: "ADMIN",
      bio: "Platform operations and moderation.",
      isOnboardingComplete: true,
      location: "Johannesburg",
    },
  });

  const amina = await prisma.user.upsert({
    where: { email: "amina@faceme.app" },
    update: {},
    create: {
      email: "amina@faceme.app",
      username: "aminanoor",
      passwordHash,
      firstName: "Amina",
      lastName: "Noor",
      bio: "Creative strategist and community builder.",
      isOnboardingComplete: true,
      location: "Johannesburg",
    },
  });

  const kabelo = await prisma.user.upsert({
    where: { email: "kabelo@faceme.app" },
    update: {},
    create: {
      email: "kabelo@faceme.app",
      username: "kabxlo",
      passwordHash,
      firstName: "Kabelo",
      lastName: "Mokoena",
      bio: "Portrait photographer and production lead.",
      isOnboardingComplete: true,
      location: "Pretoria",
    },
  });

  const zee = await prisma.user.upsert({
    where: { email: "zee@faceme.app" },
    update: {},
    create: {
      email: "zee@faceme.app",
      username: "zeed",
      passwordHash,
      firstName: "Zee",
      lastName: "Daniels",
      bio: "Brand storyteller building for bold internet culture.",
      isOnboardingComplete: true,
      location: "Cape Town",
    },
  });

  await prisma.community.upsert({
    where: { slug: "creative-circle" },
    update: {},
    create: {
      ownerId: amina.id,
      name: "Creative Circle",
      slug: "creative-circle",
      description: "A home for builders, designers, and launch teams.",
    },
  });

  const posts = await Promise.all([
    prisma.post.create({
      data: {
        authorId: amina.id,
        body: "Just wrapped a creator meetup in Johannesburg. The room had the exact FaceMe energy we wanted.",
      },
    }),
    prisma.post.create({
      data: {
        authorId: kabelo.id,
        body: "Testing a new portrait setup tonight. Strong light, sharp contrast, no wasted frames.",
      },
    }),
    prisma.post.create({
      data: {
        authorId: zee.id,
        body: "The strongest social products feel personal on the first screen and structured underneath.",
      },
    }),
  ]);

  const directConversation = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      participants: {
        create: [{ userId: amina.id }, { userId: kabelo.id }],
      },
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: directConversation.id,
        senderId: amina.id,
        text: "Can you review the updated poster layout before tonight?",
      },
      {
        conversationId: directConversation.id,
        senderId: kabelo.id,
        text: "Yes. Send the export and I will mark changes in ten minutes.",
      },
    ],
  });

  await prisma.report.create({
    data: {
      reporterId: admin.id,
      subjectUserId: zee.id,
      targetType: "POST",
      targetId: posts[2].id,
      reason: "Seed moderation item for admin workflow verification.",
      status: "OPEN",
    },
  });

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
