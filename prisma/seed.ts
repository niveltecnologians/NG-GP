import { PrismaClient, Role, TaskStatus, TaskPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@empresa.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@empresa.com",
      passwordHash,
      role: Role.ADMIN
    }
  });

  const ana = await prisma.user.upsert({
    where: { email: "ana@empresa.com" },
    update: {},
    create: { name: "Ana Gómez", email: "ana@empresa.com", passwordHash, role: Role.MEMBER }
  });

  const luis = await prisma.user.upsert({
    where: { email: "luis@empresa.com" },
    update: {},
    create: { name: "Luis Pérez", email: "luis@empresa.com", passwordHash, role: Role.MEMBER }
  });

  const project = await prisma.project.create({
    data: {
      name: "Lanzamiento Web Corporativa",
      description: "Rediseño y despliegue del sitio web institucional",
      ownerId: admin.id,
      members: {
        create: [{ userId: admin.id }, { userId: ana.id }, { userId: luis.id }]
      }
    }
  });

  await prisma.task.createMany({
    data: [
      {
        title: "Definir wireframes",
        description: "Wireframes de las páginas principales",
        status: TaskStatus.DONE,
        priority: TaskPriority.MEDIUM,
        projectId: project.id,
        assigneeId: ana.id,
        createdById: admin.id
      },
      {
        title: "Maquetar landing page",
        description: "HTML/CSS de la landing según wireframes",
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        projectId: project.id,
        assigneeId: luis.id,
        createdById: admin.id
      },
      {
        title: "Configurar despliegue",
        description: "Pipeline de CI/CD y hosting",
        status: TaskStatus.TODO,
        priority: TaskPriority.URGENT,
        projectId: project.id,
        assigneeId: admin.id,
        createdById: admin.id
      }
    ]
  });

  await prisma.ticket.create({
    data: {
      subject: "Necesito acceso al servidor de staging",
      body: "Hola, ¿me pueden dar acceso al servidor de staging para probar el despliegue?",
      senderId: luis.id,
      recipientId: admin.id
    }
  });

  console.log("Seed completado. Usuarios de prueba (password: password123):");
  console.log("- admin@empresa.com (ADMIN)");
  console.log("- ana@empresa.com (MEMBER)");
  console.log("- luis@empresa.com (MEMBER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
