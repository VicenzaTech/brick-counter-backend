/**
 * Script để khởi tạo dữ liệu cơ bản (workshops, lines, positions, devices, brick types)
 * Chạy: node scripts/seed-base-data.js
 */

const baseData = {
  workshops: [
    {
      name: 'Xưởng sản xuất chính',
      location: 'Nhà máy VicenzaTech',
      description: 'Xưởng sản xuất gạch ốp lát'
    }
  ],
  
  productionLines: [
    {
      name: 'Dây chuyền 1',
      description: 'Dây chuyền sản xuất gạch 300x600mm',
      capacity: 10000,
      status: 'active'
    },
    {
      name: 'Dây chuyền 2',
      description: 'Dây chuyền sản xuất gạch 400x800mm',
      capacity: 9000,
      status: 'unative'
    },
    {
      name: 'Dây chuyền 6',
      description: 'Dây chuyền sản xuất gạch 600x600mm',
      capacity: 11000,
      status: 'unative'
    }
  ],
  
  brickTypes: [
    {
      name: '300x600mm',
      description: 'Gạch ốp lát 300x600mm',
      unit: 'm²',
      specs: {
        width: 300,
        height: 600,
        thickness: 10
      }
    },
    {
      name: '400x800mm',
      description: 'Gạch ốp lát 400x800mm',
      unit: 'm²',
      specs: {
        width: 400,
        height: 800,
        thickness: 10
      }
    },
    {
      name: '600x600mm',
      description: 'Gạch ốp lát 600x600mm',
      unit: 'm²',
      specs: {
        width: 600,
        height: 600,
        thickness: 10
      }
    }
  ],
  
  measurementTypes: [
    {
      code: 'TELEMETRY',
      name: 'Telemetry Data',
      data_schema: {},
      description: 'Raw telemetry data from devices'
    }
  ],
  
  deviceClusters: [
    {
      name: 'Brick Counter Cluster',
      code: 'BR',
      description: 'Cluster for brick counting sensors',
      measurement_type_code: 'TELEMETRY'
    }
  ]
};

async function seedBaseData() {
  const API_URL = process.env.API_URL || 'http://localhost:5555';
  
  console.log('🌱 Bắt đầu seed dữ liệu cơ bản...\n');
  
  // 1. Create workshops
  console.log('📦 Tạo workshops...');
  const workshopIds = [];
  for (const workshop of baseData.workshops) {
    try {
      const response = await fetch(`${API_URL}/api/workshops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workshop),
      });
      
      if (response.ok) {
        const result = await response.json();
        workshopIds.push(result.id);
        console.log(`  ✅ ${workshop.name} (ID: ${result.id})`);
      } else {
        const error = await response.text();
        console.error(`  ❌ Lỗi: ${error}`);
      }
    } catch (error) {
      console.error(`  ❌ Lỗi kết nối: ${error.message}`);
    }
  }
  
  if (workshopIds.length === 0) {
    console.error('\n❌ Không thể tạo workshop. Dừng quá trình seed.');
    return;
  }
  
  const workshopId = workshopIds[0];
  
  // 2. Create production lines
  console.log('\n🏭 Tạo production lines...');
  for (const line of baseData.productionLines) {
    try {
      const response = await fetch(`${API_URL}/api/production-lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...line,
          workshopId: workshopId
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`  ✅ ${line.name} (ID: ${result.id})`);
      } else {
        const error = await response.text();
        console.error(`  ❌ Lỗi: ${error}`);
      }
    } catch (error) {
      console.error(`  ❌ Lỗi kết nối: ${error.message}`);
    }
  }
  
  // 3. Create brick types
  console.log('\n🧱 Tạo brick types...');
  for (const brickType of baseData.brickTypes) {
    try {
      const response = await fetch(`${API_URL}/api/brick-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brickType),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`  ✅ ${brickType.name} (ID: ${result.id})`);
      } else {
        const error = await response.text();
        console.error(`  ❌ Lỗi: ${error}`);
      }
    } catch (error) {
      console.error(`  ❌ Lỗi kết nối: ${error.message}`);
    }
  }
  
  // 4. Create measurement types
  console.log('\n📊 Tạo measurement types...');
  const measurementTypeIds = {};
  for (const mt of baseData.measurementTypes) {
    try {
      const response = await fetch(`${API_URL}/api/measurement-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mt),
      });
      
      if (response.ok) {
        const result = await response.json();
        measurementTypeIds[mt.code] = result.id;
        console.log(`  ✅ ${mt.name} (ID: ${result.id})`);
      } else {
        const error = await response.text();
        console.error(`  ❌ Lỗi: ${error}`);
      }
    } catch (error) {
      console.error(`  ❌ Lỗi kết nối: ${error.message}`);
    }
  }
  
  // 5. Create device clusters
  console.log('\n🔗 Tạo device clusters...');
  for (const cluster of baseData.deviceClusters) {
    try {
      const measurementTypeId = measurementTypeIds[cluster.measurement_type_code];
      if (!measurementTypeId) {
        console.error(`  ❌ Measurement type ${cluster.measurement_type_code} not found`);
        continue;
      }
      
      const response = await fetch(`${API_URL}/api/device-clusters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cluster.name,
          code: cluster.code,
          description: cluster.description,
          measurementTypeId: measurementTypeId
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`  ✅ ${cluster.name} (ID: ${result.id})`);
      } else {
        const error = await response.text();
        console.error(`  ❌ Lỗi: ${error}`);
      }
    } catch (error) {
      console.error(`  ❌ Lỗi kết nối: ${error.message}`);
    }
  }
  console.log('\n📝 Bước tiếp theo:');
  console.log('  1. Chạy: node seed-quota-targets.js');
  console.log('  2. Chạy: node generate-sample-metrics.js');
}

// Chỉ chạy khi gọi trực tiếp
if (require.main === module) {
  seedBaseData();
}

module.exports = { seedBaseData, baseData };
