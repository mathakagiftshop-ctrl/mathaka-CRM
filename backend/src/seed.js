import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = bcrypt.hashSync('admin123', 10);
  const staffPassword = bcrypt.hashSync('staff123', 10);

  try {
    // Check if admin exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'admin')
      .single();

    if (!existingAdmin) {
      await supabase.from('users').insert({
        username: 'admin',
        password: adminPassword,
        name: 'Admin User',
        role: 'admin'
      });
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Check if staff exists
    const { data: existingStaff } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'staff')
      .single();

    if (!existingStaff) {
      await supabase.from('users').insert({
        username: 'staff',
        password: staffPassword,
        name: 'Staff User',
        role: 'staff'
      });
      console.log('✅ Staff user created');
    } else {
      console.log('ℹ️  Staff user already exists');
    }

    console.log('');
    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('Default users:');
    console.log('  Admin: username=admin, password=admin123');
    console.log('  Staff: username=staff, password=staff123');
    console.log('');
    console.log('⚠️  Please change these passwords after first login!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seed();
