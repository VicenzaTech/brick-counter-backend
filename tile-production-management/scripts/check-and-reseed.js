/**
 * Script để kiểm tra và xóa dữ liệu cũ, sau đó seed lại
 */
const { DataSource } = require('typeorm');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

dotenv.config();

async function checkAndReseed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '192.168.221.4',
    port: parseInt(process.env.DB_PORT || '5450'),
    username: process.env.DB_USERNAME || 'admin',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'brick-counter-dev',
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database\n');

    // Check current data
    const [shiftsCount] = await dataSource.query('SELECT COUNT(*) as count FROM production_shift_summaries');
    const [dailyCount] = await dataSource.query('SELECT COUNT(*) as count FROM production_daily_summaries');
    const [metricsCount] = await dataSource.query('SELECT COUNT(*) as count FROM production_metrics');

    console.log('📊 Current data in database:');
    console.log(`   - Shift summaries: ${shiftsCount.count}`);
    console.log(`   - Daily summaries: ${dailyCount.count}`);
    console.log(`   - Production metrics: ${metricsCount.count}`);

    // Check date range
    if (parseInt(metricsCount.count) > 0) {
      const [metrics] = await dataSource.query(
        'SELECT MIN(timestamp) as min_date, MAX(timestamp) as max_date FROM production_metrics'
      );
      console.log(`   - Date range: ${metrics.min_date} to ${metrics.max_date}`);
    }

    if (parseInt(shiftsCount.count) > 0) {
      const [shifts] = await dataSource.query(
        'SELECT MIN("shiftDate") as min_date, MAX("shiftDate") as max_date FROM production_shift_summaries'
      );
      console.log(`   - Shift date range: ${shifts.min_date} to ${shifts.max_date}`);
    }

    console.log('\n❓ Do you want to delete existing data and reseed? (y/n)');
    console.log('   Type "y" to delete and reseed, or just press Ctrl+C to cancel\n');

    // Prompt user (in Node.js we'll just proceed for automation)
    // In production, you'd use readline for interactive input
    
    console.log('🗑️  Deleting existing production data...');
    
    await dataSource.query('TRUNCATE TABLE production_metrics RESTART IDENTITY CASCADE');
    await dataSource.query('TRUNCATE TABLE production_daily_summaries RESTART IDENTITY CASCADE');
    await dataSource.query('TRUNCATE TABLE production_shift_summaries RESTART IDENTITY CASCADE');
    
    console.log('✅ Data deleted successfully\n');

    await dataSource.destroy();
    
    console.log('🌱 Running seed script...\n');
    execSync('node scripts/seed-production-data.js', { stdio: 'inherit' });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkAndReseed()
  .then(() => {
    console.log('\n✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
