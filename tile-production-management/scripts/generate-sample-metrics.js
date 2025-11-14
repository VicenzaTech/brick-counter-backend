/**
 * Script tạo dữ liệu mẫu cho production metrics
 * Chạy: node scripts/generate-sample-metrics.js
 */

function generateRandomMetric(lineId, shift, date) {
  // Base production volumes with some randomness
  const baseVolume = 10000;
  const variance = 0.1; // ±10%
  
  const sl_ep = Math.round(baseVolume * (1 + (Math.random() - 0.5) * variance));
  
  // Hao phí mộc: ~1.5-2.5%
  const hp_moc_rate = 0.015 + Math.random() * 0.01;
  const sl_truoc_lo = Math.round(sl_ep * (1 - hp_moc_rate));
  
  // Hao phí lò: ~2-4%
  const hp_lo_rate = 0.02 + Math.random() * 0.02;
  const sl_sau_lo = Math.round(sl_truoc_lo * (1 - hp_lo_rate));
  
  // Hao phí trước mài: ~1-2%
  const hp_tm_rate = 0.01 + Math.random() * 0.01;
  const sl_truoc_mai = Math.round(sl_sau_lo * (1 - hp_tm_rate));
  
  // Sau mài cạnh: ~0.5-1%
  const sau_mai_canh_rate = 0.005 + Math.random() * 0.005;
  const sl_sau_mai_canh = Math.round(sl_truoc_mai * (1 - sau_mai_canh_rate));
  
  // Hao phí hoàn thiện: ~1-2%
  const hp_ht_rate = 0.01 + Math.random() * 0.01;
  const sl_truoc_dong_hop = Math.round(sl_truoc_mai * (1 - hp_ht_rate));
  
  return {
    timestamp: date.toISOString(),
    shift,
    sl_ep,
    sl_truoc_lo,
    sl_sau_lo,
    sl_truoc_mai,
    sl_sau_mai_canh,
    sl_truoc_dong_hop,
    productionLineId: lineId,
    brickTypeId: 1,
  };
}

async function generateSampleData(days = 7) {
  const API_URL = process.env.API_URL || 'http://localhost:5555';
  const productionLines = [1, 2, 6];
  const shifts = ['A', 'B', 'C'];
  
  console.log(`🔧 Tạo dữ liệu mẫu cho ${days} ngày...\n`);
  
  const now = new Date();
  let successCount = 0;
  let errorCount = 0;
  
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    
    for (const lineId of productionLines) {
      for (const shift of shifts) {
        // Set specific time for each shift
        let hour;
        if (shift === 'A') hour = 8;
        else if (shift === 'B') hour = 16;
        else hour = 0;
        
        date.setHours(hour, 0, 0, 0);
        
        const metric = generateRandomMetric(lineId, shift, new Date(date));
        
        try {
          const response = await fetch(`${API_URL}/api/production-metrics`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(metric),
          });
          
          if (response.ok) {
            successCount++;
            console.log(`✅ Dây chuyền ${lineId} - Ca ${shift} - ${date.toISOString().split('T')[0]}`);
          } else {
            errorCount++;
            const error = await response.text();
            console.error(`❌ Lỗi: ${error}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Lỗi kết nối: ${error.message}`);
        }
      }
    }
  }
  
  console.log(`\n📊 Tổng kết:`);
  console.log(`   ✅ Thành công: ${successCount}`);
  console.log(`   ❌ Lỗi: ${errorCount}`);
  console.log(`\n✨ Hoàn thành!`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const days = args[0] ? parseInt(args[0]) : 7;

if (require.main === module) {
  console.log(`Tạo dữ liệu cho ${days} ngày gần nhất...\n`);
  generateSampleData(days);
}

module.exports = { generateSampleData, generateRandomMetric };
