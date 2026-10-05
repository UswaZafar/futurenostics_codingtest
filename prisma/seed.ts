import { PrismaClient, Role, TaskPriority, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const password = "Password1!";

const users = [
  { email: "admin@orga.com", role: Role.ADMIN, org: "orgA" },
  { email: "manager@orga.com", role: Role.MANAGER, org: "orgA" },
  { email: "user1@orga.com", role: Role.USER, org: "orgA" },
  { email: "user2@orga.com", role: Role.USER, org: "orgA" },
  { email: "user3@orgb.com", role: Role.USER, org: "orgB" },
  { email: "user4@orgb.com", role: Role.USER, org: "orgB" },
] as const;

const statuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE];
const priorities = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH];
const tagSets = [
  ["bug", "backend"],
  ["feature"],
  ["urgent", "frontend"],
  ["docs"],
  ["api", "bug"],
];

async function main() {
  await prisma.refreshToken.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const orgA = await prisma.organization.create({ data: { name: "orgA" } });
  const orgB = await prisma.organization.create({ data: { name: "orgB" } });
  const orgs = { orgA, orgB };

  const passwordHash = await bcrypt.hash(password, 10);

  const createdUsers = await Promise.all(
    users.map((user) =>
      prisma.user.create({
        data: {
          email: user.email,
          passwordHash,
          roles: [user.role],
          orgId: orgs[user.org].id,
        },
      }),
    ),
  );

  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();

  await prisma.task.createMany({
    data: Array.from({ length: 45 }, (_, i) => {
      const owner = createdUsers[i % createdUsers.length];
      const isPast = i % 2 === 0;

      return {
        orgId: owner.orgId,
        ownerId: owner.id,
        title: `Task ${i + 1}`,
        status: statuses[i % statuses.length],
        priority: priorities[Math.floor(i / statuses.length) % priorities.length],
        tags: tagSets[i % tagSets.length],
        dueDate: new Date(now + (isPast ? -(i + 1) : i + 1) * day),
      };
    }),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
