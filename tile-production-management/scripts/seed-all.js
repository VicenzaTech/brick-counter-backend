/**
 * Master seed script - Chạy tất cả seeds theo thứ tự đúng
 * Chạy: node scripts/seed-all.js
 */

const { seedBaseData } = require('./seed-base-data');
const { seedQuotaTargets } = require('./seed-quota-targets');
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5450,
  database: 'brick-counter-dev',
  user: 'admin',
  password: '123456',
});

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProductionData(days = 30) {
  const endDate = new Date(2025, 10, 16); // Nov 16, 2025
  const records = [];

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const currentDate = new Date(endDate);
    currentDate.setDate(currentDate.getDate() - dayOffset);
    const recordDate = currentDate.toISOString().split('T')[0];

    // Base production values (daily totals)
    const sl_ep = getRandomInt(3000, 4500);
    const sl_truoc_lo = sl_ep - getRandomInt(50, 150);
    const sl_sau_lo = sl_truoc_lo - getRandomInt(80, 200);
    const sl_truoc_mai = sl_sau_lo - getRandomInt(30, 100);
    const sl_sau_mai_canh = sl_truoc_mai - getRandomInt(20, 80);
    const sl_truoc_dong_hop = sl_sau_mai_canh - getRandomInt(10, 50);

    // Calculated waste
    const hp_moc = sl_ep - sl_truoc_lo;
    const hp_lo = sl_truoc_lo - sl_sau_lo;
    const hp_tm = sl_truoc_mai - sl_sau_mai_canh;
    const hp_ht = sl_sau_mai_canh - sl_truoc_dong_hop;
    const tong_hao_phi = hp_moc + hp_lo + hp_tm + hp_ht;

    // Percentages
    const ty_le_hp_moc = ((hp_moc / sl_ep) * 100).toFixed(2);
    const ty_le_hp_lo = ((hp_lo / sl_truoc_lo) * 100).toFixed(2);
    const ty_le_hp_tm = ((hp_tm / sl_truoc_mai) * 100).toFixed(2);
    const ty_le_hp_ht = ((hp_ht / sl_sau_mai_canh) * 100).toFixed(2);
    const ty_le_tong_hao_phi = ((tong_hao_phi / sl_ep) * 100).toFixed(2);

    // Efficiencies
    const hieu_suat_moc = (100 - parseFloat(ty_le_hp_moc)).toFixed(2);
    const hieu_suat_lo = (100 - parseFloat(ty_le_hp_lo)).toFixed(2);
    const hieu_suat_truoc_mai = (100 - parseFloat(ty_le_hp_tm)).toFixed(2);
    const hieu_suat_thanh_pham = (100 - parseFloat(ty_le_tong_hao_phi)).toFixed(2);

    // Alerts
    const canh_bao_hp_moc = parseFloat(ty_le_hp_moc) > 5.0;
    const canh_bao_hp_lo = parseFloat(ty_le_hp_lo) > 8.0;
    const canh_bao_hp_tm = parseFloat(ty_le_hp_tm) > 3.0;
    const canh_bao_hp_ht = parseFloat(ty_le_hp_ht) > 2.0;

    const congDoanVanDe = [];
    if (canh_bao_hp_moc) congDoanVanDe.push('Mốc');
    if (canh_bao_hp_lo) congDoanVanDe.push('Lò');
    if (canh_bao_hp_tm) congDoanVanDe.push('Trước mài');
    if (canh_bao_hp_ht) congDoanVanDe.push('Hoàn thiện');

    const xu_huong = parseFloat(ty_le_tong_hao_phi) < 10 ? 'giam' : 
                     parseFloat(ty_le_tong_hao_phi) > 15 ? 'tang' : 'on-dinh';

    records.push({
      recordDate,
      sl_ep, sl_truoc_lo, sl_sau_lo, sl_truoc_mai, sl_sau_mai_canh, sl_truoc_dong_hop,
      hp_moc, hp_lo, hp_tm, hp_ht, tong_hao_phi,
      ty_le_hp_moc, ty_le_hp_lo, ty_le_hp_tm, ty_le_hp_ht, ty_le_tong_hao_phi,
      hieu_suat_moc, hieu_suat_lo, hieu_suat_truoc_mai, hieu_suat_thanh_pham,
      canh_bao_hp_moc, canh_bao_hp_lo, canh_bao_hp_tm, canh_bao_hp_ht,
      cong_doan_van_de: `{${congDoanVanDe.join(',')}}`,
      xu_huong,
    });
  }

  return records;
}

async function seedProductionMetrics(days = 30) {
  try {
    await client.connect();
    console.log('  → Kết nối database...');

    // Get production lines 2, 5, 6
    const lineResult = await client.query(`SELECT id FROM production_lines WHERE id IN (2, 5, 6) ORDER BY id`);
    if (lineResult.rows.length === 0) {
      throw new Error('Không tìm thấy production lines 2, 5, 6!');
    }
    
    console.log(`  → Tìm thấy ${lineResult.rows.length} dây chuyền:`, lineResult.rows.map(l => `Line ${l.id}`).join(', '));

    // Get all brick types
    const brickTypesResult = await client.query(`SELECT id, name, description FROM brick_types ORDER BY id`);
    if (brickTypesResult.rows.length === 0) {
      console.log('  ⚠️  Không tìm thấy brick types, sẽ tạo mới...');
      
      // Seed brick types if not exists
      const brickTypesToCreate = [
        { name: '300x600mm', description: 'Gạch ốp lát 300x600mm', unit: 'm²' },
        { name: '400x800mm', description: 'Gạch ốp lát 400x800mm', unit: 'm²' },
        { name: '600x600mm', description: 'Gạch ốp lát 600x600mm', unit: 'm²' },
      ];
      
      for (const bt of brickTypesToCreate) {
        await client.query(
          `INSERT INTO brick_types (name, description, unit, specs) 
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [bt.name, bt.description, bt.unit, JSON.stringify({ width: parseInt(bt.name), height: parseInt(bt.name.split('x')[1]) })]
        );
      }
      
      // Re-fetch brick types
      const recheck = await client.query(`SELECT id, name, description FROM brick_types ORDER BY id`);
      if (recheck.rows.length === 0) {
        throw new Error('Không thể tạo brick types!');
      }
      brickTypesResult.rows = recheck.rows;
      console.log(`  ✓ Đã tạo ${brickTypesResult.rows.length} loại gạch`);
    } else {
      console.log(`  → Tìm thấy ${brickTypesResult.rows.length} loại gạch`);
    }

    // Generate data
    const sampleData = generateProductionData(days);
    console.log(`  → Tạo ${sampleData.length} ngày dữ liệu`);

    let insertedCount = 0;

    // Loop through production lines
    for (const line of lineResult.rows) {
      console.log(`\n  → Seed dữ liệu cho Dây chuyền ${line.id}...`);
      
      // Loop through brick types
      for (const brickType of brickTypesResult.rows) {
        // Generate new random data for each line to have different values
        const lineData = generateProductionData(days);
        
        for (const record of lineData) {
          // Check existing
          const existingCheck = await client.query(
            `SELECT id FROM production_metrics 
             WHERE "recordDate" = $1 
             AND "productionLineId" = $2 
             AND "brickTypeId" = $3`,
            [record.recordDate, line.id, brickType.id]
          );

          if (existingCheck.rows.length > 0) continue;

          const insertQuery = `
            INSERT INTO production_metrics (
              "recordDate",
              sl_ep, sl_truoc_lo, sl_sau_lo, sl_truoc_mai, sl_sau_mai_canh, sl_truoc_dong_hop,
              hp_moc, hp_lo, hp_tm, hp_ht, tong_hao_phi,
              ty_le_hp_moc, ty_le_hp_lo, ty_le_hp_tm, ty_le_hp_ht, ty_le_tong_hao_phi,
              hieu_suat_moc, hieu_suat_lo, hieu_suat_truoc_mai, hieu_suat_thanh_pham,
              canh_bao_hp_moc, canh_bao_hp_lo, canh_bao_hp_tm, canh_bao_hp_ht,
              cong_doan_van_de, xu_huong, "productionLineId", "brickTypeId"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
              $13, $14, $15, $16, $17, $18, $19, $20, $21,
              $22, $23, $24, $25, $26, $27, $28, $29
            )
          `;

          await client.query(insertQuery, [
            record.recordDate,
            record.sl_ep, record.sl_truoc_lo, record.sl_sau_lo, record.sl_truoc_mai, 
            record.sl_sau_mai_canh, record.sl_truoc_dong_hop,
            record.hp_moc, record.hp_lo, record.hp_tm, record.hp_ht, record.tong_hao_phi,
            record.ty_le_hp_moc, record.ty_le_hp_lo, record.ty_le_hp_tm, record.ty_le_hp_ht, 
            record.ty_le_tong_hao_phi,
            record.hieu_suat_moc, record.hieu_suat_lo, record.hieu_suat_truoc_mai, 
            record.hieu_suat_thanh_pham,
            record.canh_bao_hp_moc, record.canh_bao_hp_lo, record.canh_bao_hp_tm, 
            record.canh_bao_hp_ht,
            record.cong_doan_van_de, record.xu_huong, line.id, brickType.id
          ]);

          insertedCount++;
        }
      }
    }

    console.log(`\n  ✓ Đã tạo ${insertedCount} production metrics records`);
    console.log(`    (${days} ngày × ${lineResult.rows.length} dây chuyền × ${brickTypesResult.rows.length} loại gạch)`);

  } catch (error) {
    console.error('  ✗ Lỗi khi seed production metrics:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function seedAll() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 BẮT ĐẦU KHỞI TẠO DỮ LIỆU HOÀN CHỈNH');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // Step 1: Base data (workshops, lines, brick types)
    console.log('BƯỚC 1/3: Tạo dữ liệu cơ bản...\n');
    await seedBaseData();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Quota targets
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('BƯỚC 2/3: Tạo mức khoán...\n');
    await seedQuotaTargets();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Production metrics (30 days, daily only)
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('BƯỚC 3/3: Tạo dữ liệu production metrics...\n');
    await seedProductionMetrics(30);
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ HOÀN THÀNH KHỞI TẠO DỮ LIỆU!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📊 Dữ liệu đã được tạo:');
    console.log('  ✓ 1 Workshop');
    console.log('  ✓ 3 Production Lines (2, 5, 6)');
    console.log('  ✓ 3 Brick Types (300x600mm, 400x800mm, 600x600mm)');
    console.log('  ✓ 3 Quota Targets');
    console.log('  ✓ 270 Production Metrics (30 ngày × 3 dây chuyền × 3 loại gạch)');
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
