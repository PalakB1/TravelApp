// Set a login password for an existing account — the recovery route when
// someone is locked out.
//
//   npx tsx prisma/set-password.ts admin@travel.local
//
// Run this in YOUR OWN terminal. It asks for the new password and hides what you
// type, so the password is never written into a command, a log, or a chat.
// Passwords are stored one-way hashed (bcrypt), so this SETS a new one — it can
// never read the old one back.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import readline from "node:readline";

const prisma = new PrismaClient();

// Prompt without echoing the characters back to the screen.
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = process.stdout as NodeJS.WriteStream & { muted?: boolean };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rl as any)._writeToOutput = (s: string) => { if (!out.muted) out.write(s); };
    rl.question(question, (answer) => { out.muted = false; process.stdout.write("\n"); rl.close(); resolve(answer); });
    out.muted = true;
  });
}

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  if (!email) {
    console.error("Usage: npx tsx prisma/set-password.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { email: true, name: true, isPlatformAdmin: true } });
  if (!user) {
    const all = await prisma.user.findMany({ select: { email: true } });
    console.error(`No account with email "${email}".\nKnown accounts:\n  ` + all.map((u) => u.email).join("\n  "));
    process.exit(1);
  }

  console.log(`Setting a new password for: ${user.name} <${user.email}>${user.isPlatformAdmin ? "  [platform admin]" : ""}`);
  const pw = await askHidden("New password (min 8 characters, typing is hidden): ");
  if (pw.length < 8) { console.error("Too short — use at least 8 characters. Nothing was changed."); process.exit(1); }
  const again = await askHidden("Type it once more to confirm: ");
  if (pw !== again) { console.error("The two entries didn't match. Nothing was changed."); process.exit(1); }

  await prisma.user.update({ where: { email }, data: { passwordHash: await bcrypt.hash(pw, 10) } });
  console.log(`\nDone. Sign in as ${email} with your new password.`);
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
