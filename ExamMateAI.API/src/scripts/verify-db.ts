import { prisma, testDatabaseConnection } from '../infrastructure/database/prisma.js';
import { authService } from '../modules/auth/auth.service.js';

async function main() {
  console.log('--- Step 1: Testing Database Connection ---');
  const connected = await testDatabaseConnection();
  if (!connected) {
    console.error('❌ Database connection failed. Please verify credentials in .env.');
    process.exit(1);
  }

  console.log('--- Step 2: Querying Database Tables ---');
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  console.log('Tables in public schema:', tables.map((t) => t.table_name));

  console.log('--- Step 3: Testing User Registration & Login ---');
  const testEmail = `test_verification_${Date.now()}@exammate.ai`;
  const testPassword = 'Password@123';
  const testName = 'Verification Bot';

  const regResult = await authService.register({
    email: testEmail,
    password: testPassword,
    fullName: testName,
    role: 'Student',
  });
  console.log('✅ Registration successful. Created user ID:', regResult.user.id);

  const loginResult = await authService.login({
    email: testEmail,
    password: testPassword,
  });
  console.log('✅ Login successful. Received token for user:', loginResult.user.email);

  // Clean up test user
  await prisma.user.delete({ where: { id: regResult.user.id } });
  console.log('✅ Test user cleaned up.');
  console.log('🎉 ALL DATABASE VERIFICATION TESTS PASSED!');
}

main()
  .catch((err) => {
    console.error('❌ Verification failed with error:', err.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
