/**
 * Supabase Database Configuration
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Load credentials from config files
const fs = require('fs');

let supabaseUrl, supabaseKey;

try {
  const supabaseConfig = JSON.parse(
    fs.readFileSync('/root/config/supabase-credentials.json', 'utf8')
  );
  supabaseUrl = supabaseConfig.url;
  supabaseKey = supabaseConfig.secret_key;
} catch (error) {
  console.error('Error loading Supabase credentials:', error.message);
  // Fallback to environment variables
  supabaseUrl = process.env.SUPABASE_URL;
  supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

module.exports = {
  supabase,
  testConnection
};
