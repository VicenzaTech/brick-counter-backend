/**
 * Master seed script - Chạy tất cả seeds theo thứ tự đúng
 * Chạy: node scripts/seed-all.js
 */

const { seedBaseData } = require('./seed-base-data');
const { seedQuotaTargets } = require('./seed-quota-targets');
const { generateSampleData } = require('./generate-sample-metrics');

async function seedAll() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 BẮT ĐẦU KHỞI TẠO DỮ LIỆU HOÀN CHỈNH');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // Step 1: Base data (workshops, lines, brick types)
    console.log('BƯỚC 1/3: Tạo dữ liệu cơ bản...\n');
    await seedBaseData();
    
    // Wait a bit for database to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Quota targets
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('BƯỚC 2/3: Tạo mức khoán...\n');
    await seedQuotaTargets();
    
    // Wait a bit for database to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Sample metrics (7 days)
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('BƯỚC 3/3: Tạo dữ liệu metrics mẫu...\n');
    await generateSampleData(7);
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ HOÀN THÀNH KHỞI TẠO DỮ LIỆU!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📊 Dữ liệu đã được tạo:');
    console.log('  ✓ 1 Workshop');
    console.log('  ✓ 3 Production Lines (1, 2, 6)');
    console.log('  ✓ 3 Brick Types (300x600mm, 400x800mm, 600x600mm)');
    console.log('  ✓ 3 Quota Targets');
    console.log('  ✓ 63 Production Metrics (7 ngày × 3 dây chuyền × 3 ca)');
    console.log('\n🌐 Bạn có thể truy cập:');
    console.log('  • Backend API: http://localhost:5555/api');
    console.log('  • Frontend: http://localhost:3000');
    console.log('  • Analytics: http://localhost:3000/analytics');
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ LỖI TRONG QUÁ TRÌNH SEED:', error.message);
    console.error('Vui lòng kiểm tra lại kết nối database và API server.');
  }
}

// Chỉ chạy khi gọi trực tiếp
if (require.main === module) {
  seedAll();
}

module.exports = { seedAll };
