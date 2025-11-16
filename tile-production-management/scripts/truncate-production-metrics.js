/**
 * Script để xóa toàn bộ dữ liệu trong bảng production_metrics
 * Chạy trước khi thay đổi cấu trúc entity (remove shift, add recordDate)
 * 
 * Chạy: node scripts/truncate-production-metrics.js
 */

const { Client } = require('pg');

const client = new Client({
  host: '192.168.221.4',
  port: 5450,
  database: 'brick-counter-dev',
  user: 'postgres',
  password: 'postgres',
});

async function truncateTable() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Truncate production_metrics table
    await client.query('TRUNCATE TABLE production_metrics RESTART IDENTITY CASCADE');
    
    console.log('✅ Successfully truncated production_metrics table');
    console.log('   All data has been deleted.');
    console.log('   You can now restart the backend to apply new entity structure.');

  } catch (error) {
    console.error('❌ Error truncating table:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

truncateTable();
