/**
 * CLI helper to promote a user to ADMIN.
 *
 * Usage:
 *   npm run seed:admin -- email@example.com
 *   npm run seed:admin -- email@example.com --create --password Hunter2!
 *
 * `--create` provisions the account if it doesn't exist yet (requires
 * `--password`). Without flags, the script exits with an error if the email is
 * unknown so a typo never silently creates an extra account.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

interface Args {
  email: string;
  create: boolean;
  password?: string;
}

const parseArgs = (): Args => {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith('--'));
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      flags.set(a.slice(2), next);
      i += 1;
    } else {
      flags.set(a.slice(2), true);
    }
  }
  const email = positional[0];
  if (!email) {
    console.error('Usage: seed:admin <email> [--create --password <pwd>]');
    process.exit(1);
  }
  const password = flags.get('password');
  return {
    email,
    create: flags.get('create') === true,
    password: typeof password === 'string' ? password : undefined,
  };
};

async function main() {
  const { email, create, password } = parseArgs();
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'ADMIN', deletedAt: null },
        select: { id: true, email: true, role: true },
      });
      console.log(
        `[seed:admin] Promoted ${user.email} (${user.id}) → role=${user.role}`,
      );
      return;
    }
    if (!create) {
      console.error(
        `[seed:admin] No user found with email "${email}". Pass --create --password <pwd> to provision.`,
      );
      process.exit(1);
    }
    if (!password || password.length < 8) {
      console.error(
        '[seed:admin] --create requires --password of at least 8 characters.',
      );
      process.exit(1);
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: email.split('@')[0],
        role: 'ADMIN',
        settings: { create: {} },
      },
      select: { id: true, email: true, role: true },
    });
    console.log(
      `[seed:admin] Created ${user.email} (${user.id}) with role=${user.role}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
