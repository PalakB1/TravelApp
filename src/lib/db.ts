import { PrismaClient } from "@prisma/client";

// Models that support soft-delete (a `deletedAt` stamp). Reads automatically
// exclude soft-deleted rows unless a query explicitly filters on `deletedAt`
// (the recycle bin does, to SEE them). Writes are never intercepted.
const SOFT = new Set(["Trip", "Booking", "Customer", "Expense", "CustomTrip"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hideDeleted(model: string | undefined, args: any) {
  if (model && SOFT.has(model) && args?.where?.deletedAt === undefined) {
    args.where = { ...args.where, deletedAt: null };
  }
  return args;
}

function makeClient() {
  return new PrismaClient({ log: ["error", "warn"] }).$extends({
    name: "soft-delete",
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async findMany({ model, args, query }: any) { return query(hideDeleted(model, args)); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async findFirst({ model, args, query }: any) { return query(hideDeleted(model, args)); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async findFirstOrThrow({ model, args, query }: any) { return query(hideDeleted(model, args)); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async count({ model, args, query }: any) { return query(hideDeleted(model, args)); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async aggregate({ model, args, query }: any) { return query(hideDeleted(model, args)); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async groupBy({ model, args, query }: any) { return query(hideDeleted(model, args)); },
        // findUnique's where only allows unique fields, so filter the result instead.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async findUnique({ model, args, query }: any) {
          const r = await query(args);
          return model && SOFT.has(model) && r && r.deletedAt ? null : r;
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof makeClient> };

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
