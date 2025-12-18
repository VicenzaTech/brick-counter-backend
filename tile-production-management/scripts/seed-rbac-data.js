const bcrypt = require('bcrypt');
const { DataSource } = require('typeorm');
require('dotenv').config();

// ====== CONFIG KẾT NỐI DATABASE ======
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5450', 10),
  username: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'brick-counter-dev',
  synchronize: false,
  logging: false,
});

const PERMISSIONS = {
  // User
  USER_READ: 'user.read',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_DISABLE: 'user.disable',

  // Role
  ROLE_READ: 'role.read',
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',

  // Workshop / production structure
  WORKSHOP_READ: 'workshop.read',
  WORKSHOP_CREATE: 'workshop.create',
  WORKSHOP_UPDATE: 'workshop.update',
  WORKSHOP_DELETE: 'workshop.delete',

  PRODUCTION_LINE_READ: 'production-line.read',
  PRODUCTION_LINE_CREATE: 'production-line.create',
  PRODUCTION_LINE_UPDATE: 'production-line.update',
  PRODUCTION_LINE_DELETE: 'production-line.delete',

  POSITION_READ: 'position.read',
  POSITION_CREATE: 'position.create',
  POSITION_UPDATE: 'position.update',
  POSITION_DELETE: 'position.delete',

  // Devices & telemetry
  DEVICE_READ: 'device.read',
  DEVICE_CREATE: 'device.create',
  DEVICE_UPDATE: 'device.update',
  DEVICE_DELETE: 'device.delete',

  // Production & brick types
  PRODUCTION_READ: 'production.read',
  PRODUCTION_CREATE: 'production.create',
  PRODUCTION_UPDATE: 'production.update',
  PRODUCTION_DELETE: 'production.delete',

  BRICK_TYPE_READ: 'brick-type.read',
  BRICK_TYPE_CREATE: 'brick-type.create',
  BRICK_TYPE_UPDATE: 'brick-type.update',
  BRICK_TYPE_DELETE: 'brick-type.delete',

  // Metrics & quotas
  PRODUCTION_METRIC_READ: 'production-metric.read',
  PRODUCTION_METRIC_CREATE: 'production-metric.create',
  PRODUCTION_METRIC_UPDATE: 'production-metric.update',
  PRODUCTION_METRIC_DELETE: 'production-metric.delete',

  QUOTA_TARGET_READ: 'quota-target.read',
  QUOTA_TARGET_CREATE: 'quota-target.create',
  QUOTA_TARGET_UPDATE: 'quota-target.update',
  QUOTA_TARGET_DELETE: 'quota-target.delete',

  WORKSHOP_TARGET_READ: 'workshop-target.read',
  WORKSHOP_TARGET_CREATE: 'workshop-target.create',
  WORKSHOP_TARGET_UPDATE: 'workshop-target.update',
  WORKSHOP_TARGET_DELETE: 'workshop-target.delete',

  // Maintenance
  MAINTENANCE_LOG_READ: 'maintenance-log.read',
  MAINTENANCE_LOG_CREATE: 'maintenance-log.create',
  MAINTENANCE_LOG_UPDATE: 'maintenance-log.update',
  MAINTENANCE_LOG_DELETE: 'maintenance-log.delete',
};

const PERMISSION_DEFINITIONS = [
  // User
  { code: PERMISSIONS.USER_READ, description: 'Read users' },
  { code: PERMISSIONS.USER_CREATE, description: 'Create users' },
  { code: PERMISSIONS.USER_UPDATE, description: 'Update users' },
  { code: PERMISSIONS.USER_DELETE, description: 'Delete users' },
  { code: PERMISSIONS.USER_DISABLE, description: 'Disable users' },

  // Role
  { code: PERMISSIONS.ROLE_READ, description: 'Read roles' },
  { code: PERMISSIONS.ROLE_CREATE, description: 'Create roles' },
  { code: PERMISSIONS.ROLE_UPDATE, description: 'Update roles' },
  { code: PERMISSIONS.ROLE_DELETE, description: 'Delete roles' },

  // Workshop / production structure
  { code: PERMISSIONS.WORKSHOP_READ, description: 'Read workshops' },
  { code: PERMISSIONS.WORKSHOP_CREATE, description: 'Create workshops' },
  { code: PERMISSIONS.WORKSHOP_UPDATE, description: 'Update workshops' },
  { code: PERMISSIONS.WORKSHOP_DELETE, description: 'Delete workshops' },

  { code: PERMISSIONS.PRODUCTION_LINE_READ, description: 'Read production lines' },
  { code: PERMISSIONS.PRODUCTION_LINE_CREATE, description: 'Create production lines' },
  { code: PERMISSIONS.PRODUCTION_LINE_UPDATE, description: 'Update production lines' },
  { code: PERMISSIONS.PRODUCTION_LINE_DELETE, description: 'Delete production lines' },

  { code: PERMISSIONS.POSITION_READ, description: 'Read positions' },
  { code: PERMISSIONS.POSITION_CREATE, description: 'Create positions' },
  { code: PERMISSIONS.POSITION_UPDATE, description: 'Update positions' },
  { code: PERMISSIONS.POSITION_DELETE, description: 'Delete positions' },

  // Devices & telemetry
  { code: PERMISSIONS.DEVICE_READ, description: 'Read devices' },
  { code: PERMISSIONS.DEVICE_CREATE, description: 'Create devices' },
  { code: PERMISSIONS.DEVICE_UPDATE, description: 'Update devices' },
  { code: PERMISSIONS.DEVICE_DELETE, description: 'Delete devices' },

  // Production & brick types
  { code: PERMISSIONS.PRODUCTION_READ, description: 'Read productions' },
  { code: PERMISSIONS.PRODUCTION_CREATE, description: 'Create productions' },
  { code: PERMISSIONS.PRODUCTION_UPDATE, description: 'Update productions' },
  { code: PERMISSIONS.PRODUCTION_DELETE, description: 'Delete productions' },

  { code: PERMISSIONS.BRICK_TYPE_READ, description: 'Read brick types' },
  { code: PERMISSIONS.BRICK_TYPE_CREATE, description: 'Create brick types' },
  { code: PERMISSIONS.BRICK_TYPE_UPDATE, description: 'Update brick types' },
  { code: PERMISSIONS.BRICK_TYPE_DELETE, description: 'Delete brick types' },

  // Metrics & quotas
  { code: PERMISSIONS.PRODUCTION_METRIC_READ, description: 'Read production metrics' },
  { code: PERMISSIONS.PRODUCTION_METRIC_CREATE, description: 'Create production metrics' },
  { code: PERMISSIONS.PRODUCTION_METRIC_UPDATE, description: 'Update production metrics' },
  { code: PERMISSIONS.PRODUCTION_METRIC_DELETE, description: 'Delete production metrics' },

  { code: PERMISSIONS.QUOTA_TARGET_READ, description: 'Read quota targets' },
  { code: PERMISSIONS.QUOTA_TARGET_CREATE, description: 'Create quota targets' },
  { code: PERMISSIONS.QUOTA_TARGET_UPDATE, description: 'Update quota targets' },
  { code: PERMISSIONS.QUOTA_TARGET_DELETE, description: 'Delete quota targets' },

  { code: PERMISSIONS.WORKSHOP_TARGET_READ, description: 'Read workshop targets' },
  { code: PERMISSIONS.WORKSHOP_TARGET_CREATE, description: 'Create workshop targets' },
  { code: PERMISSIONS.WORKSHOP_TARGET_UPDATE, description: 'Update workshop targets' },
  { code: PERMISSIONS.WORKSHOP_TARGET_DELETE, description: 'Delete workshop targets' },

  // Maintenance
  { code: PERMISSIONS.MAINTENANCE_LOG_READ, description: 'Read maintenance logs' },
  { code: PERMISSIONS.MAINTENANCE_LOG_CREATE, description: 'Create maintenance logs' },
  { code: PERMISSIONS.MAINTENANCE_LOG_UPDATE, description: 'Update maintenance logs' },
  { code: PERMISSIONS.MAINTENANCE_LOG_DELETE, description: 'Delete maintenance logs' },
];

// Nhóm manage -> liệt kê rõ gồm những quyền nào
const PERMISSION_GROUPS = {
  USER_MANAGE: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_DISABLE,
  ],
  ROLE_MANAGE: [
    PERMISSIONS.ROLE_READ,
    PERMISSIONS.ROLE_CREATE,
    PERMISSIONS.ROLE_UPDATE,
    PERMISSIONS.ROLE_DELETE,
  ],
  WORKSHOP_MANAGE: [
    PERMISSIONS.WORKSHOP_READ,
    PERMISSIONS.WORKSHOP_CREATE,
    PERMISSIONS.WORKSHOP_UPDATE,
    PERMISSIONS.WORKSHOP_DELETE,
  ],
  PRODUCTION_LINE_MANAGE: [
    PERMISSIONS.PRODUCTION_LINE_READ,
    PERMISSIONS.PRODUCTION_LINE_CREATE,
    PERMISSIONS.PRODUCTION_LINE_UPDATE,
    PERMISSIONS.PRODUCTION_LINE_DELETE,
  ],
  POSITION_MANAGE: [
    PERMISSIONS.POSITION_READ,
    PERMISSIONS.POSITION_CREATE,
    PERMISSIONS.POSITION_UPDATE,
    PERMISSIONS.POSITION_DELETE,
  ],
  DEVICE_MANAGE: [
    PERMISSIONS.DEVICE_READ,
    PERMISSIONS.DEVICE_CREATE,
    PERMISSIONS.DEVICE_UPDATE,
    PERMISSIONS.DEVICE_DELETE,
  ],
  PRODUCTION_MANAGE: [
    PERMISSIONS.PRODUCTION_READ,
    PERMISSIONS.PRODUCTION_CREATE,
    PERMISSIONS.PRODUCTION_UPDATE,
    PERMISSIONS.PRODUCTION_DELETE,
  ],
  BRICK_TYPE_MANAGE: [
    PERMISSIONS.BRICK_TYPE_READ,
    PERMISSIONS.BRICK_TYPE_CREATE,
    PERMISSIONS.BRICK_TYPE_UPDATE,
    PERMISSIONS.BRICK_TYPE_DELETE,
  ],
  PRODUCTION_METRIC_MANAGE: [
    PERMISSIONS.PRODUCTION_METRIC_READ,
    PERMISSIONS.PRODUCTION_METRIC_CREATE,
    PERMISSIONS.PRODUCTION_METRIC_UPDATE,
    PERMISSIONS.PRODUCTION_METRIC_DELETE,
  ],
  QUOTA_TARGET_MANAGE: [
    PERMISSIONS.QUOTA_TARGET_READ,
    PERMISSIONS.QUOTA_TARGET_CREATE,
    PERMISSIONS.QUOTA_TARGET_UPDATE,
    PERMISSIONS.QUOTA_TARGET_DELETE,
  ],
  WORKSHOP_TARGET_MANAGE: [
    PERMISSIONS.WORKSHOP_TARGET_READ,
    PERMISSIONS.WORKSHOP_TARGET_CREATE,
    PERMISSIONS.WORKSHOP_TARGET_UPDATE,
    PERMISSIONS.WORKSHOP_TARGET_DELETE,
  ],
  MAINTENANCE_LOG_MANAGE: [
    PERMISSIONS.MAINTENANCE_LOG_READ,
    PERMISSIONS.MAINTENANCE_LOG_CREATE,
    PERMISSIONS.MAINTENANCE_LOG_UPDATE,
    PERMISSIONS.MAINTENANCE_LOG_DELETE,
  ],
};

// Định nghĩa role và quyền tương ứng
const ROLE_DEFINITIONS = {
  superadmin: {
    name: 'Super Administrator',
    description: 'Toàn quyền hệ thống',
    permissions: PERMISSION_DEFINITIONS.map((p) => p.code), // full quyền
  },
  admin: {
    name: 'Administrator',
    description: 'Quản trị viên',
    permissions: [
      ...PERMISSION_GROUPS.USER_MANAGE,
      ...PERMISSION_GROUPS.ROLE_MANAGE,
      ...PERMISSION_GROUPS.WORKSHOP_MANAGE,
      ...PERMISSION_GROUPS.PRODUCTION_LINE_MANAGE,
      ...PERMISSION_GROUPS.POSITION_MANAGE,
      ...PERMISSION_GROUPS.DEVICE_MANAGE,
      ...PERMISSION_GROUPS.BRICK_TYPE_MANAGE,
      ...PERMISSION_GROUPS.PRODUCTION_MANAGE,
      ...PERMISSION_GROUPS.PRODUCTION_METRIC_MANAGE,
      ...PERMISSION_GROUPS.QUOTA_TARGET_MANAGE,
      ...PERMISSION_GROUPS.WORKSHOP_TARGET_MANAGE,
      ...PERMISSION_GROUPS.MAINTENANCE_LOG_MANAGE,
    ],
  },
  operator: {
    name: 'Operator',
    description: 'Nhân viên vận hành',
    permissions: [
      // Được đọc gần như mọi thứ
      PERMISSIONS.WORKSHOP_READ,
      PERMISSIONS.PRODUCTION_LINE_READ,
      PERMISSIONS.POSITION_READ,
      PERMISSIONS.DEVICE_READ,
      PERMISSIONS.BRICK_TYPE_READ,
      PERMISSIONS.PRODUCTION_READ,
      PERMISSIONS.PRODUCTION_METRIC_READ,
      PERMISSIONS.QUOTA_TARGET_READ,
      PERMISSIONS.WORKSHOP_TARGET_READ,
      PERMISSIONS.MAINTENANCE_LOG_READ,

      // Và một số thao tác cập nhật sản xuất thực tế
      PERMISSIONS.PRODUCTION_UPDATE,
      PERMISSIONS.PRODUCTION_METRIC_CREATE,
      PERMISSIONS.PRODUCTION_METRIC_UPDATE,
      PERMISSIONS.MAINTENANCE_LOG_CREATE,
      PERMISSIONS.MAINTENANCE_LOG_UPDATE,
    ],
  },
};

// ===============================
//        SEED SCRIPT
// ===============================
async function seedRBAC() {
  console.log('➡️  Starting RBAC seeding...\n');

  try {
    await dataSource.initialize();
    console.log('✅ Connected to DB\n');

    // Tạo hash mật khẩu test
    const passwordHash = await bcrypt.hash('admin123', 10);

    // ===============================
    // 0) XÓA DỮ LIỆU RBAC CŨ
    // ===============================
    console.log('🧹 Cleaning old RBAC data...');
    await dataSource.query('DELETE FROM user_roles;');
    await dataSource.query('DELETE FROM role_permissions;');
    await dataSource.query('DELETE FROM roles;');
    await dataSource.query('DELETE FROM permissions;');

    // ===============================
    // 1) PERMISSIONS
    // ===============================
    console.log('📝 Seeding permissions...');
    for (const perm of PERMISSION_DEFINITIONS) {
      await dataSource.query(
        'INSERT INTO permissions (code, description) VALUES ($1, $2);',
        [perm.code, perm.description],
      );
    }

    // ===============================
    // 2) ROLES
    // ===============================
    console.log('📝 Seeding roles...');
    for (const [slug, def] of Object.entries(ROLE_DEFINITIONS)) {
      await dataSource.query(
        'INSERT INTO roles (slug, name, description) VALUES ($1, $2, $3);',
        [slug, def.name, def.description],
      );
    }

    // Lấy lại id roles & permissions
    const roles = await dataSource.query('SELECT id, slug FROM roles;');
    const permissions = await dataSource.query('SELECT id, code FROM permissions;');

    const roleBySlug = Object.fromEntries(roles.map((r) => [r.slug, r.id]));
    const permByCode = Object.fromEntries(permissions.map((p) => [p.code, p.id]));

    // ===============================
    // 3) ROLE_PERMISSIONS
    // ===============================
    console.log('🔗 Seeding role_permissions...');
    for (const [slug, def] of Object.entries(ROLE_DEFINITIONS)) {
      const roleId = roleBySlug[slug];
      if (!roleId) continue;

      // Loại bỏ trùng lặp
      const uniquePermCodes = Array.from(new Set(def.permissions));

      for (const code of uniquePermCodes) {
        const permId = permByCode[code];
        if (!permId) {
          console.warn(`⚠️  Permission code not found in DB: ${code}`);
          continue;
        }

        await dataSource.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2);',
          [roleId, permId],
        );
      }
    }

    // ===============================
    // 4) USERS
    // ===============================
    console.log('👤 Seeding users...');
    const users = [
      { email: 'superadmin@example.com', username: 'superadmin', passwordHash },
      { email: 'admin@example.com', username: 'admin', passwordHash },
      { email: 'operator@example.com', username: 'operator', passwordHash },
    ];

    for (const user of users) {
      await dataSource.query(
        `INSERT INTO users (email, username, "passwordHash", "isActive")
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, "passwordHash" = EXCLUDED."passwordHash";`,
        [user.email, user.username, user.passwordHash],
      );
    }

    // Lấy lại user_id & role_id
    const dbUsers = await dataSource.query('SELECT id, username FROM users;');
    const userByUsername = Object.fromEntries(dbUsers.map((u) => [u.username, u.id]));

    // ===============================
    // 5) USER_ROLES
    // ===============================
    console.log('🔗 Seeding user_roles...');

    const userRolePairs = [
      { username: 'superadmin', roleSlug: 'superadmin' },
      { username: 'admin', roleSlug: 'admin' },
      { username: 'operator', roleSlug: 'operator' },
    ];

    for (const pair of userRolePairs) {
      const userId = userByUsername[pair.username];
      const roleId = roleBySlug[pair.roleSlug];
      if (!userId || !roleId) continue;

      await dataSource.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING;',
        [userId, roleId],
      );
    }

    console.log('\n✅ RBAC seeding completed successfully!');
  } catch (err) {
    console.error('❌ Error while seeding:', err);
  } finally {
    await dataSource.destroy();
    console.log('🔌 DB connection closed');
  }
}

seedRBAC();

