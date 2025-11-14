/**
 * Script để khởi tạo dữ liệu mức khoán mẫu
 * Chạy: node scripts/seed-quota-targets.js
 */

const quotaTargets = [
  {
    name: 'Khoán 300x600mm - Standard',
    monthly_target: 273300,
    daily_target: 9110,
    product_size: '300x600mm',
    threshold_hp_moc: 2,
    threshold_hp_lo: 3,
    threshold_hp_tm: 2,
    threshold_hp_ht: 2,
    target_efficiency: 91,
    description: 'Mức khoán tiêu chuẩn cho gạch 300x600mm',
    is_active: true,
  },
  {
    name: 'Khoán 400x800mm - Standard',
    monthly_target: 250000,
    daily_target: 8333,
    product_size: '400x800mm',
    threshold_hp_moc: 2,
    threshold_hp_lo: 3,
    threshold_hp_tm: 2,
    threshold_hp_ht: 2,
    target_efficiency: 90,
    description: 'Mức khoán tiêu chuẩn cho gạch 400x800mm',
    is_active: true,
  },
  {
    name: 'Khoán 600x600mm - Standard',
    monthly_target: 300000,
    daily_target: 10000,
    product_size: '600x600mm',
    threshold_hp_moc: 1.8,
    threshold_hp_lo: 2.8,
    threshold_hp_tm: 1.8,
    threshold_hp_ht: 1.8,
    target_efficiency: 92,
    description: 'Mức khoán tiêu chuẩn cho gạch 600x600mm',
    is_active: true,
  },
];

async function seedQuotaTargets() {
  const API_URL = process.env.API_URL || 'http://localhost:5555';
  
  console.log('🌱 Bắt đầu seed dữ liệu mức khoán...\n');
  
  for (const quota of quotaTargets) {
    try {
      const response = await fetch(`${API_URL}/api/quota-targets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quota),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Đã tạo: ${quota.name} (ID: ${result.id})`);
      } else {
        const error = await response.text();
        console.error(`❌ Lỗi khi tạo ${quota.name}: ${error}`);
      }
    } catch (error) {
      console.error(`❌ Lỗi kết nối: ${error.message}`);
    }
  }
  
  console.log('\n✨ Hoàn thành seed dữ liệu!');
}

// Chỉ chạy khi gọi trực tiếp
if (require.main === module) {
  seedQuotaTargets();
}

module.exports = { seedQuotaTargets, quotaTargets };
