/**
 * Shift Utilities
 * 
 * Helper functions để tính toán ca làm việc và phân loại thời gian
 * 
 * Quy định ca:
 * - Ca ngày (Day Shift):  06:00 - 18:00
 * - Ca đêm (Night Shift): 18:00 - 06:00 (hôm sau)
 */

export interface ShiftInfo {
  shiftType: 'day' | 'night';
  shiftDate: string; // YYYY-MM-DD
  shiftNumber: number; // Số thứ tự ca trong năm
  shiftStartAt: Date;
  shiftEndAt: Date;
}

/**
 * Xác định thông tin ca làm việc dựa vào timestamp
 */
export function getShiftInfo(timestamp: Date): ShiftInfo {
  const hour = timestamp.getHours();
  const minute = timestamp.getMinutes();
  
  // Xác định loại ca và ngày của ca
  let shiftType: 'day' | 'night';
  let shiftDate: Date;
  
  if (hour >= 6 && hour < 18) {
    // Ca ngày: 6h-18h cùng ngày
    shiftType = 'day';
    shiftDate = new Date(timestamp);
  } else if (hour >= 18) {
    // Ca đêm: 18h-24h, tính vào ca đêm của ngày hiện tại
    shiftType = 'night';
    shiftDate = new Date(timestamp);
  } else {
    // Ca đêm: 0h-6h, tính vào ca đêm của ngày hôm trước
    shiftType = 'night';
    shiftDate = new Date(timestamp);
    shiftDate.setDate(shiftDate.getDate() - 1);
  }
  
  // Format ngày YYYY-MM-DD
  const dateStr = shiftDate.toISOString().split('T')[0];
  
  // Tính thời gian bắt đầu và kết thúc ca
  const { shiftStartAt, shiftEndAt } = getShiftBoundaries(shiftDate, shiftType);
  
  // Tính số thứ tự ca trong năm
  const shiftNumber = calculateShiftNumber(shiftDate, shiftType);
  
  return {
    shiftType,
    shiftDate: dateStr,
    shiftNumber,
    shiftStartAt,
    shiftEndAt,
  };
}

/**
 * Tính thời gian bắt đầu và kết thúc của ca
 */
export function getShiftBoundaries(date: Date, shiftType: 'day' | 'night'): {
  shiftStartAt: Date;
  shiftEndAt: Date;
} {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  if (shiftType === 'day') {
    // Ca ngày: 6h-18h cùng ngày
    const shiftStartAt = new Date(year, month, day, 6, 0, 0);
    const shiftEndAt = new Date(year, month, day, 18, 0, 0);
    return { shiftStartAt, shiftEndAt };
  } else {
    // Ca đêm: 18h hôm nay - 6h hôm sau
    const shiftStartAt = new Date(year, month, day, 18, 0, 0);
    const shiftEndAt = new Date(year, month, day + 1, 6, 0, 0);
    return { shiftStartAt, shiftEndAt };
  }
}

/**
 * Tính số thứ tự ca trong năm (1-730)
 * Mỗi ngày có 2 ca → 365 ngày × 2 = 730 ca/năm
 */
export function calculateShiftNumber(date: Date, shiftType: 'day' | 'night'): number {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Mỗi ngày có 2 ca
  const baseShiftNumber = (dayOfYear - 1) * 2;
  
  // Ca ngày = số chẵn, ca đêm = số lẻ
  return shiftType === 'day' ? baseShiftNumber + 1 : baseShiftNumber + 2;
}

/**
 * Lấy thông tin ca hiện tại
 */
export function getCurrentShiftInfo(): ShiftInfo {
  return getShiftInfo(new Date());
}

/**
 * Lấy thông tin ca trước đó
 */
export function getPreviousShiftInfo(currentShift: ShiftInfo): ShiftInfo {
  const { shiftDate, shiftType } = currentShift;
  const date = new Date(shiftDate);
  
  if (shiftType === 'day') {
    // Ca hiện tại là ca ngày → ca trước là ca đêm của ngày hôm trước
    date.setDate(date.getDate() - 1);
    return getShiftInfo(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 20, 0, 0)); // 20h = ca đêm
  } else {
    // Ca hiện tại là ca đêm → ca trước là ca ngày cùng ngày
    return getShiftInfo(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)); // 12h = ca ngày
  }
}

/**
 * Kiểm tra xem timestamp có thuộc ca nào không
 */
export function isInShift(timestamp: Date, shiftDate: string, shiftType: 'day' | 'night'): boolean {
  const date = new Date(shiftDate);
  const { shiftStartAt, shiftEndAt } = getShiftBoundaries(date, shiftType);
  
  return timestamp >= shiftStartAt && timestamp < shiftEndAt;
}

/**
 * Lấy danh sách các ca trong khoảng thời gian
 */
export function getShiftsInRange(startDate: Date, endDate: Date): ShiftInfo[] {
  const shifts: ShiftInfo[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    // Thêm ca ngày
    const dayShift = getShiftInfo(new Date(current.getFullYear(), current.getMonth(), current.getDate(), 12, 0, 0));
    shifts.push(dayShift);
    
    // Thêm ca đêm
    const nightShift = getShiftInfo(new Date(current.getFullYear(), current.getMonth(), current.getDate(), 20, 0, 0));
    shifts.push(nightShift);
    
    current.setDate(current.getDate() + 1);
  }
  
  return shifts;
}

/**
 * Format thông tin ca thành string
 */
export function formatShiftInfo(shift: ShiftInfo): string {
  const shiftTypeName = shift.shiftType === 'day' ? 'Ca ngày' : 'Ca đêm';
  const dateStr = new Date(shift.shiftDate).toLocaleDateString('vi-VN');
  const timeRange = shift.shiftType === 'day' ? '06:00-18:00' : '18:00-06:00';
  
  return `${shiftTypeName} ${dateStr} (${timeRange})`;
}

/**
 * Tính số giờ làm việc trong ca (12 giờ)
 */
export function getShiftDurationHours(): number {
  return 12;
}

/**
 * Kiểm tra xem có đang trong giờ làm việc không
 */
export function isWorkingTime(timestamp: Date = new Date()): boolean {
  const hour = timestamp.getHours();
  // Luôn trong giờ làm việc vì có 2 ca liên tục 24/7
  return true;
}

/**
 * Lấy ngày làm việc (business date) dựa vào timestamp
 * Quy ước: Nếu trong ca đêm (0h-6h), tính về ngày hôm trước
 */
export function getBusinessDate(timestamp: Date): string {
  const hour = timestamp.getHours();
  const date = new Date(timestamp);
  
  if (hour < 6) {
    // Ca đêm: 0h-6h → tính về ngày hôm trước
    date.setDate(date.getDate() - 1);
  }
  
  return date.toISOString().split('T')[0];
}
