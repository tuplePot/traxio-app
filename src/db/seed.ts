import 'dotenv/config';
import { auth } from '../lib/auth';

async function seed() {
  console.log('Seeding user...');

  const { user } = await auth.api.signUpEmail({
    body: {
      name: 'Demo User',
      email: 'demo@traxio.com',
      password: 'password123',
    },
  });

  // if (!user) {
  //   console.error('Gagal buat user');
  //   process.exit(1);
  // }

  console.log('User berhasil dibuat:');
  console.log('  Email   :', user.email);
  console.log('  Nama    :', user.name);
  console.log('  ID      :', user.id);
}

seed();
