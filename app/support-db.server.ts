import { PrismaClient } from "@prisma/support-client";

declare global {
  // eslint-disable-next-line no-var
  var supportPrismaGlobal: PrismaClient;
}

if (process.env.NODE_ENV !== "production") {
  if (!global.supportPrismaGlobal) {
    global.supportPrismaGlobal = new PrismaClient();
  }
}

const supportPrisma = global.supportPrismaGlobal ?? new PrismaClient();

export default supportPrisma;
