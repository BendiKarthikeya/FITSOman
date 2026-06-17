import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const { Pool } = pg;

// New admin password - change this to your desired password
const NEW_PASSWORD = 'Admin@BusinessMatch2024';
const ADMIN_USERNAME = 'admin';

async function resetAdminPassword() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Resetting admin password...');
    
    // Check if admin exists
    const adminResult = await pool.query(
      'SELECT * FROM users WHERE username = $1 LIMIT 1',
      [ADMIN_USERNAME]
    );
    
    if (adminResult.rows.length === 0) {
      console.log('Admin user not found!');
      await pool.end();
      return;
    }
    
    const admin = adminResult.rows[0];
    console.log('Found admin user:', admin.username, '(' + admin.email + ')');
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
    
    // Update the password
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, admin.id]
    );
    
    console.log('Password reset successfully!');
    console.log('------------------------------------');
    console.log('Username:', admin.username);
    console.log('Email:', admin.email);
    console.log('New Password:', NEW_PASSWORD);
    console.log('------------------------------------');
    console.log('Please use these credentials to log in.');
    
    await pool.end();
  } catch (error) {
    console.error('Error resetting password:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the reset
resetAdminPassword();
