import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const { Pool } = pg;

// Default admin credentials - these should be changed after initial login
const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@businessmatchoman.com',
  password: 'Admin@BusinessMatch2024', // This should be a strong password
  fullName: 'System Administrator',
  role: 'admin',
};

/**
 * Creates or updates the default admin account
 */
async function setupDefaultAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Setting up default admin account...');
    
    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2 LIMIT 1',
      [DEFAULT_ADMIN.username, DEFAULT_ADMIN.email]
    );
    
    if (existingAdmin.rows.length > 0) {
      console.log('Admin account already exists.');
      console.log('Existing admin username:', existingAdmin.rows[0].username);
      console.log('Existing admin email:', existingAdmin.rows[0].email);
      console.log('Existing admin role:', existingAdmin.rows[0].role);
      
      // Update to ensure it has admin role
      if (existingAdmin.rows[0].role !== 'admin') {
        await pool.query(
          'UPDATE users SET role = $1 WHERE id = $2',
          ['admin', existingAdmin.rows[0].id]
        );
        console.log('Updated user role to admin');
      }
      
      await pool.end();
      return;
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, salt);
    
    // Create the admin account
    const result = await pool.query(
      `INSERT INTO users (username, email, password, "fullName", role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [
        DEFAULT_ADMIN.username,
        DEFAULT_ADMIN.email,
        hashedPassword,
        DEFAULT_ADMIN.fullName,
        DEFAULT_ADMIN.role,
      ]
    );
    
    console.log('Admin account created successfully.');
    console.log('------------------------------------');
    console.log('Username:', DEFAULT_ADMIN.username);
    console.log('Email:', DEFAULT_ADMIN.email);
    console.log('Password:', DEFAULT_ADMIN.password);
    console.log('------------------------------------');
    console.log('Please change these credentials after first login for security.');
    
    await pool.end();
  } catch (error) {
    console.error('Error creating admin account:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the setup
setupDefaultAdmin();