import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'Orange@2025';
const saltRounds = 10;

async function generateHash() {
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('密碼:', password);
  console.log('Hash:', hash);
}

generateHash();
