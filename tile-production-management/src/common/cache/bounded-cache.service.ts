/**
 * Bounded Cache Service
 * Thread-safe bounded cache với automatic cleanup
 * Tự động xóa entries cũ nhất khi đạt max_size
 * 
 * Tương tự bounded_cache.py trong old-vicenza-ims-web
 */
import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

@Injectable()
export class BoundedCacheService {
  private readonly logger = new Logger(BoundedCacheService.name);
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds
  private cleanupInterval: number;
  private lastCleanup: number;

  constructor(maxSize: number = 1000, ttl: number = 3600000) {
    // ttl default 1 hour
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.cleanupInterval = 300000; // 5 minutes
    this.lastCleanup = Date.now();
  }

  /**
   * Thêm hoặc cập nhật value trong cache
   */
  set<T>(key: string, value: T): void {
    const currentTime = Date.now();

    // Set value và timestamp
    this.cache.set(key, {
      value,
      timestamp: currentTime,
    });

    // Kiểm tra và evict nếu vượt quá max_size
    if (this.cache.size > this.maxSize) {
      // Remove oldest item (first item in Map)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.logger.debug(`Evicted oldest cache entry: ${oldestKey}`);
    }

    // Periodic cleanup expired entries
    if (currentTime - this.lastCleanup > this.cleanupInterval) {
      this.cleanupExpired();
      this.lastCleanup = currentTime;
    }
  }

  /**
   * Lấy value từ cache
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return defaultValue;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return defaultValue;
    }

    return entry.value as T;
  }

  /**
   * Kiểm tra key đã expired chưa
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    const age = Date.now() - entry.timestamp;
    return age > this.ttl;
  }

  /**
   * Cleanup tất cả expired entries
   */
  private cleanupExpired(): void {
    const currentTime = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (currentTime - entry.timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach((key) => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      this.logger.log(
        `Cleaned up ${expiredKeys.length} expired cache entries`,
      );
    }
  }

  /**
   * Xóa toàn bộ cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Trả về số lượng entries hiện tại
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Trả về list các keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Kiểm tra key có tồn tại không
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
}

/**
 * Rate Limit Cache Service
 * Cache với rate limiting cho broadcasting
 * Tránh broadcast quá nhiều trong thời gian ngắn
 */
@Injectable()
export class RateLimitCacheService {
  private readonly logger = new Logger(RateLimitCacheService.name);
  private lastBroadcast: Map<string, number>;
  private minInterval: number; // milliseconds

  constructor(minInterval: number = 500) {
    // default 500ms
    this.minInterval = minInterval;
    this.lastBroadcast = new Map();
  }

  /**
   * Kiểm tra có nên broadcast không
   * Returns true nếu đã đủ thời gian từ lần broadcast trước
   */
  shouldBroadcast(key: string): boolean {
    const currentTime = Date.now();
    const lastTime = this.lastBroadcast.get(key) || 0;

    if (currentTime - lastTime >= this.minInterval) {
      this.lastBroadcast.set(key, currentTime);
      return true;
    }

    return false;
  }

  /**
   * Force update last broadcast time
   */
  forceBroadcast(key: string): void {
    this.lastBroadcast.set(key, Date.now());
  }

  /**
   * Clear tất cả rate limit data
   */
  clear(): void {
    this.lastBroadcast.clear();
  }

  /**
   * Trả về số lượng rate limit entries
   */
  size(): number {
    return this.lastBroadcast.size;
  }
}
