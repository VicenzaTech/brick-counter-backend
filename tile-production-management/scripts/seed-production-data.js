/**
 * Script seed fake production data cho 30 ngày gần nhất
 * Tạo data cho:
 * - production_shift_summaries (ca ngày và ca đêm)
 * - production_daily_summaries (tổng hợp từ 2 ca)
 * - production_metrics (analytics metrics - tổng hợp từ nhiều devices)
 * 
 * Chạy: node scripts/seed-production-data.js
 */

const { DataSource } = require('typeorm');
const dotenv = require('dotenv');

dotenv.config();

// Cấu hình
const DAYS_TO_GENERATE = 30;
const END_DATE = new Date('2025-11-16T23:59:59'); // Ngày 16/11/2025
const DEVICE_IDS = [
  'SAU-ME-01',
  'SAU-ME-02',
  'TRUOC-LN-01',
  'TRUOC-LN-02',
  'SAU-LN-01',
  'TRUOC-MM-01',
  'SAU-MC-01',
  'TRUOC-DH-01',
];

/**
 * Tạo số ngẫu nhiên trong khoảng
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Tạo số thực ngẫu nhiên
 */
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Tính shift number (số thứ tự ca trong năm)
 */
function calculateShiftNumber(date, shiftType) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
  return shiftType === 'day' ? dayOfYear * 2 - 1 : dayOfYear * 2;
}

/**
 * Lấy thông tin shift boundaries
 */
function getShiftBoundaries(date, shiftType) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  if (shiftType === 'day') {
    return {
      shiftStartAt: new Date(year, month, day, 6, 0, 0),
      shiftEndAt: new Date(year, month, day, 18, 0, 0),
    };
  } else {
    return {
      shiftStartAt: new Date(year, month, day, 18, 0, 0),
      shiftEndAt: new Date(year, month, day + 1, 6, 0, 0),
    };
  }
}

/**
 * Seed production data
 */
async function seedProductionData() {
  console.log('🚀 Starting production data seeding...\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5450'),
    username: process.env.DB_USERNAME || 'admin',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'brick-counter-dev',
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established\n');

    // Lấy danh sách devices
    const devices = await dataSource.query(
      `SELECT "deviceId", name, "positionId" FROM devices WHERE "deviceId" = ANY($1)`,
      [DEVICE_IDS]
    );

    if (devices.length === 0) {
      console.log('⚠️ No devices found! Please run seed-devices first.');
      return;
    }

    console.log(`📦 Found ${devices.length} devices\n`);

    // Lấy position info để có productionLineId và workshopId
    const deviceWithRelations = await Promise.all(
      devices.map(async (device) => {
        if (!device.positionId) {
          return { ...device, productionLineId: null, workshopId: null };
        }
        
        const position = await dataSource.query(
          `SELECT "productionLineId" FROM positions WHERE id = $1`,
          [device.positionId]
        );
        
        if (!position[0]?.productionLineId) {
          return { ...device, productionLineId: null, workshopId: null };
        }
        
        const line = await dataSource.query(
          `SELECT "workshopId" FROM production_lines WHERE id = $1`,
          [position[0].productionLineId]
        );
        
        return {
          ...device,
          productionLineId: position[0].productionLineId,
          workshopId: line[0]?.workshopId || null,
        };
      })
    );

    let totalShiftSummaries = 0;
    let totalDailySummaries = 0;
    let totalMetrics = 0;

    // Lấy production line (dây chuyền 1)
    const productionLines = await dataSource.query(
      `SELECT id, name FROM production_lines WHERE id = 1 LIMIT 1`
    );
    const productionLineId = productionLines[0]?.id || 1;

    // Lấy tất cả brick types
    const brickTypes = await dataSource.query(
      `SELECT id, name, description FROM brick_types ORDER BY id`
    );

    if (brickTypes.length === 0) {
      console.log('⚠️ No brick types found. Please run seed-base-data.js first.');
      return;
    }

    console.log(`📍 Using production line: ${productionLines[0]?.name || 'Dây chuyền 1'} (ID: ${productionLineId})`);
    console.log(`🧱 Brick types found: ${brickTypes.length}`);
    brickTypes.forEach(bt => console.log(`   - ${bt.name}: ${bt.description || ''} (ID: ${bt.id})`));
    console.log('');

    // Generate data cho từng ngày trong 30 ngày
    for (let dayOffset = DAYS_TO_GENERATE - 1; dayOffset >= 0; dayOffset--) {
      const currentDate = new Date(END_DATE);
      currentDate.setDate(currentDate.getDate() - dayOffset);
      const dateStr = currentDate.toISOString().split('T')[0];

      console.log(`📅 Generating data for ${dateStr}...`);

      // Generate cho từng device
      for (const device of deviceWithRelations) {
        const deviceId = device.deviceId;

        // === 1. SHIFT SUMMARIES (2 ca: ngày và đêm) ===
        const shifts = ['day', 'night'];
        const shiftData = [];

        for (const shiftType of shifts) {
          const { shiftStartAt, shiftEndAt } = getShiftBoundaries(currentDate, shiftType);
          const shiftNumber = calculateShiftNumber(currentDate, shiftType);

          // Random production data
          const startCount = randomInt(10000, 50000);
          const totalCount = randomInt(800, 1500); // Sản xuất trong ca
          const endCount = startCount + totalCount;
          
          const totalErrCount = randomInt(5, 50);
          const errorRate = (totalErrCount / totalCount) * 100;
          
          const messageCount = randomInt(100, 200); // Số lượng MQTT messages
          const avgRssi = randomInt(-60, -30);
          const minRssi = randomInt(-70, -60);
          const maxRssi = randomInt(-30, -20);
          const avgBattery = randomInt(80, 100);
          const avgTemperature = randomInt(25, 35);
          const avgUptime = randomInt(43000, 43200); // ~12 hours
          const avgProductionRate = totalCount / 12; // sản phẩm/giờ

          // Check if exists
          const existing = await dataSource.query(
            `SELECT id FROM production_shift_summaries 
             WHERE "deviceId" = $1 AND "shiftDate" = $2 AND "shiftType" = $3`,
            [deviceId, dateStr, shiftType]
          );

          if (existing.length === 0) {
            await dataSource.query(
              `INSERT INTO production_shift_summaries (
                "deviceId", "shiftDate", "shiftType", "shiftNumber",
                "shiftStartAt", "shiftEndAt",
                "startCount", "endCount", "totalCount",
                "startErrCount", "endErrCount", "totalErrCount", "errorRate",
                "messageCount", "avgRssi", "minRssi", "maxRssi",
                "avgBattery", "avgTemperature", "avgUptime", "avgProductionRate",
                "positionId", "productionLineId", "workshopId",
                "status", "closedAt", "closedBy"
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
              )`,
              [
                deviceId, dateStr, shiftType, shiftNumber,
                shiftStartAt, shiftEndAt,
                startCount, endCount, totalCount,
                startCount, endCount, totalErrCount, errorRate,
                messageCount, avgRssi, minRssi, maxRssi,
                avgBattery, avgTemperature, avgUptime, avgProductionRate,
                device.positionId, device.productionLineId, device.workshopId,
                'completed', shiftEndAt, 'system'
              ]
            );

            totalShiftSummaries++;
          }

          shiftData.push({ totalCount, totalErrCount });
        }

        // === 2. DAILY SUMMARY (tổng hợp 2 ca) ===
        const dayShiftCount = shiftData[0].totalCount;
        const nightShiftCount = shiftData[1].totalCount;
        const totalDayCount = dayShiftCount + nightShiftCount;
        
        const dayShiftErrCount = shiftData[0].totalErrCount;
        const nightShiftErrCount = shiftData[1].totalErrCount;
        const totalDayErrCount = dayShiftErrCount + nightShiftErrCount;
        
        const dailyErrorRate = (totalDayErrCount / totalDayCount) * 100;
        const avgDailyProductionRate = totalDayCount / 24;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();
        const dayOfWeek = currentDate.getDay();
        
        const firstDayOfYear = new Date(year, 0, 1);
        const daysSinceStart = Math.floor((currentDate - firstDayOfYear) / (1000 * 60 * 60 * 24));
        const weekOfYear = Math.ceil((daysSinceStart + firstDayOfYear.getDay() + 1) / 7);

        const existingDaily = await dataSource.query(
          `SELECT id FROM production_daily_summaries 
           WHERE "deviceId" = $1 AND "summaryDate" = $2`,
          [deviceId, dateStr]
        );

        if (existingDaily.length === 0) {
          await dataSource.query(
            `INSERT INTO production_daily_summaries (
              "deviceId", "summaryDate", "year", "month", "day", "dayOfWeek", "weekOfYear",
              "dayShiftCount", "nightShiftCount", "totalCount",
              "dayShiftErrCount", "nightShiftErrCount", "totalErrCount", "errorRate",
              "avgRssi", "avgBattery", "avgTemperature",
              "messageCount", "avgProductionRate",
              "positionId", "productionLineId", "workshopId",
              "status", "closedAt", "closedBy"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
            )`,
            [
              deviceId, dateStr, year, month, day, dayOfWeek, weekOfYear,
              dayShiftCount, nightShiftCount, totalDayCount,
              dayShiftErrCount, nightShiftErrCount, totalDayErrCount, dailyErrorRate,
              randomInt(-50, -30), randomInt(85, 95), randomInt(28, 32),
              randomInt(200, 400), avgDailyProductionRate,
              device.positionId, device.productionLineId, device.workshopId,
              'completed', new Date(currentDate.getTime() + 24 * 60 * 60 * 1000), 'system'
            ]
          );

          totalDailySummaries++;
        }
      }

      // === 3. PRODUCTION METRICS (Analytics workflow - tổng hợp tất cả devices) ===
      // Tạo metrics cho mỗi ca (2 lần/ngày) và cho TẤT CẢ brick types
      const shifts = ['day', 'night'];
      
      // Tạo metrics cho từng loại gạch
      for (const brickType of brickTypes) {
        for (const shiftType of shifts) {
          const { shiftStartAt } = getShiftBoundaries(currentDate, shiftType);
          const shiftName = shiftType === 'day' ? 'Ca 1' : 'Ca 2';

          // Tổng hợp sản lượng từ các devices theo workflow
          // Workflow: Ép → Trước lò → Sau lò → Trước mài → Sau mài cạnh → Trước đóng hộp
          const sl_ep = randomInt(8000, 12000); // SAU-ME-01 + SAU-ME-02
          const sl_truoc_lo = Math.floor(sl_ep * randomFloat(0.96, 0.99)); // TRUOC-LN-01 + TRUOC-LN-02
          const sl_sau_lo = Math.floor(sl_truoc_lo * randomFloat(0.94, 0.97)); // SAU-LN-01
          const sl_truoc_mai = Math.floor(sl_sau_lo * randomFloat(0.96, 0.99)); // TRUOC-MM-01
          const sl_sau_mai_canh = Math.floor(sl_truoc_mai * randomFloat(0.96, 0.99)); // SAU-MC-01
          const sl_truoc_dong_hop = Math.floor(sl_sau_mai_canh * randomFloat(0.96, 0.99)); // TRUOC-DH-01

          // Tính hao phí
          const hp_moc = sl_ep - sl_truoc_lo;
          const ty_le_hp_moc = (hp_moc / sl_ep) * 100;
          const hp_lo = sl_truoc_lo - sl_sau_lo;
          const ty_le_hp_lo = (hp_lo / sl_ep) * 100;
          const hp_tm = sl_sau_lo - sl_truoc_mai;
          const ty_le_hp_tm = (hp_tm / sl_ep) * 100;
          const hp_ht = sl_truoc_mai - sl_truoc_dong_hop;
          const ty_le_hp_ht = (hp_ht / sl_ep) * 100;
          const tong_hao_phi = hp_moc + hp_lo + hp_tm + hp_ht;
          const ty_le_tong_hao_phi = (tong_hao_phi / sl_ep) * 100;

          // Tính hiệu suất
          const hieu_suat_moc = (sl_truoc_lo / sl_ep) * 100;
          const hieu_suat_lo = (sl_sau_lo / sl_ep) * 100;
          const hieu_suat_truoc_mai = (sl_truoc_mai / sl_ep) * 100;
          const hieu_suat_thanh_pham = (sl_truoc_dong_hop / sl_ep) * 100;

          // Cảnh báo
          const canh_bao_hp_moc = ty_le_hp_moc > 2;
          const canh_bao_hp_lo = ty_le_hp_lo > 3;
          const canh_bao_hp_tm = ty_le_hp_tm > 2;
          const canh_bao_hp_ht = ty_le_hp_ht > 2;

          const cong_doan_van_de = [];
          if (canh_bao_hp_moc) cong_doan_van_de.push('Mộc');
          if (canh_bao_hp_lo) cong_doan_van_de.push('Lò');
          if (canh_bao_hp_tm) cong_doan_van_de.push('Trước mài');
          if (canh_bao_hp_ht) cong_doan_van_de.push('Hoàn thiện');

          // Xu hướng ngẫu nhiên
          const xu_huong_options = ['tang', 'giam', 'on-dinh'];
          const xu_huong = xu_huong_options[randomInt(0, 2)];

          const existingMetric = await dataSource.query(
            `SELECT id FROM production_metrics WHERE timestamp = $1 AND shift = $2 AND "productionLineId" = $3 AND "brickTypeId" = $4`,
            [shiftStartAt, shiftName, productionLineId, brickType.id]
          );

          if (existingMetric.length === 0) {
            await dataSource.query(
              `INSERT INTO production_metrics (
                timestamp, shift,
                sl_ep, sl_truoc_lo, sl_sau_lo, sl_truoc_mai, sl_sau_mai_canh, sl_truoc_dong_hop,
                hp_moc, ty_le_hp_moc, hp_lo, ty_le_hp_lo, hp_tm, ty_le_hp_tm, hp_ht, ty_le_hp_ht,
                tong_hao_phi, ty_le_tong_hao_phi,
                hieu_suat_moc, hieu_suat_lo, hieu_suat_truoc_mai, hieu_suat_thanh_pham,
                canh_bao_hp_moc, canh_bao_hp_lo, canh_bao_hp_tm, canh_bao_hp_ht,
                cong_doan_van_de, xu_huong, "productionLineId", "brickTypeId"
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
              )`,
              [
                shiftStartAt, shiftName,
                sl_ep, sl_truoc_lo, sl_sau_lo, sl_truoc_mai, sl_sau_mai_canh, sl_truoc_dong_hop,
                hp_moc, ty_le_hp_moc, hp_lo, ty_le_hp_lo, hp_tm, ty_le_hp_tm, hp_ht, ty_le_hp_ht,
                tong_hao_phi, ty_le_tong_hao_phi,
                hieu_suat_moc, hieu_suat_lo, hieu_suat_truoc_mai, hieu_suat_thanh_pham,
                canh_bao_hp_moc, canh_bao_hp_lo, canh_bao_hp_tm, canh_bao_hp_ht,
                cong_doan_van_de.join(','), xu_huong, productionLineId, brickType.id
              ]
            );

            totalMetrics++;
          }
        }
      }
    }

    console.log('\n✅ Production data seeding completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Shift summaries: ${totalShiftSummaries} (per device, per shift)`);
    console.log(`   - Daily summaries: ${totalDailySummaries} (per device, per day)`);
    console.log(`   - Production metrics: ${totalMetrics} (workflow analytics, per shift, per brick type)`);
    console.log(`   - Date range: ${DAYS_TO_GENERATE} days (ending ${END_DATE.toISOString().split('T')[0]})`);
    console.log(`   - Devices: ${devices.length}`);
    console.log(`   - Brick types: ${brickTypes.length}`);
    console.log(`\n💡 Expected totals:`);
    console.log(`   - Shift summaries: ${DAYS_TO_GENERATE} days × ${devices.length} devices × 2 shifts = ${DAYS_TO_GENERATE * devices.length * 2}`);
    console.log(`   - Daily summaries: ${DAYS_TO_GENERATE} days × ${devices.length} devices = ${DAYS_TO_GENERATE * devices.length}`);
    console.log(`   - Production metrics: ${DAYS_TO_GENERATE} days × 2 shifts × ${brickTypes.length} brick types = ${DAYS_TO_GENERATE * 2 * brickTypes.length}`);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 Database connection closed');
  }
}

// Run
seedProductionData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
