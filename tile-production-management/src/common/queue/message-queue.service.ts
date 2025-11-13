/**
 * MQTT Message Queue Service
 * Message queue với Redis locks để xử lý messages theo thứ tự
 * Tránh race conditions khi nhiều messages đến cùng lúc từ cùng device
 * 
 * Tương tự message_queue.py trong old-vicenza-ims-web
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class MessageQueueService {
  private readonly logger = new Logger(MessageQueueService.name);
  private readonly maxLockTimeout = 10; // Maximum 10 seconds per message
  private readonly maxRetries = 3;
  private readonly retryDelay = 10; // 10ms

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * Xử lý message với Redis lock để tránh race condition
   */
  async processWithLock<T>(
    deviceId: string,
    messageData: T,
    handlerFunc: (deviceId: string, data: T) => Promise<void> | void,
    handlerName: string = 'handler',
  ): Promise<boolean> {
    const lockKey = `mqtt_lock_${deviceId}_${handlerName}`;
    let retryCount = 0;

    while (retryCount < this.maxRetries) {
      try {
        // Try to acquire lock (atomic operation in Redis)
        // SET NX EX: Set if Not eXists with EXpiration
        const acquired = await this.redis.set(
          lockKey,
          '1',
          'EX',
          this.maxLockTimeout,
          'NX',
        );

        if (acquired === 'OK') {
          try {
            // Process message
            const startTime = Date.now();
            await handlerFunc(deviceId, messageData);

            // Log processing time
            const processTime = Date.now() - startTime;
            if (processTime > 1000) {
              this.logger.warn(
                `Slow message processing: ${handlerName} for ${deviceId} took ${processTime}ms`,
              );
            }

            return true;
          } catch (error) {
            this.logger.error(
              `Error in ${handlerName} for ${deviceId}: ${error.message}`,
              error.stack,
            );
            return false;
          } finally {
            // Always release lock
            await this.redis.del(lockKey);
          }
        } else {
          // Lock is held by another process, wait and retry
          retryCount++;
          if (retryCount < this.maxRetries) {
            // Exponential backoff
            const waitTime = this.retryDelay * Math.pow(2, retryCount);
            await this.sleep(waitTime);
          } else {
            this.logger.warn(
              `Failed to acquire lock for ${deviceId} after ${this.maxRetries} retries`,
            );
            return false;
          }
        }
      } catch (error) {
        this.logger.error(
          `Redis error in processWithLock: ${error.message}`,
          error.stack,
        );
        return false;
      }
    }

    return false;
  }

  /**
   * Xử lý message với kiểm tra thứ tự timestamp
   */
  async processOrdered<T>(
    deviceId: string,
    timestamp: number,
    messageData: T,
    handlerFunc: (deviceId: string, data: T) => Promise<void> | void,
    handlerName: string = 'handler',
  ): Promise<boolean> {
    const lockKey = `mqtt_lock_${deviceId}_${handlerName}`;
    const timestampKey = `mqtt_ts_${deviceId}_${handlerName}`;

    try {
      // Try to acquire lock
      const acquired = await this.redis.set(
        lockKey,
        '1',
        'EX',
        this.maxLockTimeout,
        'NX',
      );

      if (acquired !== 'OK') {
        this.logger.warn(`Could not acquire lock for ${deviceId}`);
        return false;
      }

      try {
        // Check if this message is older than last processed message
        const lastTimestampStr = await this.redis.get(timestampKey);
        const lastTimestamp = lastTimestampStr
          ? parseFloat(lastTimestampStr)
          : 0;

        if (timestamp < lastTimestamp) {
          this.logger.warn(
            `Out-of-order message for ${deviceId}: current=${timestamp}, last=${lastTimestamp}. Skipping.`,
          );
          return false;
        }

        // Process message
        await handlerFunc(deviceId, messageData);

        // Update last processed timestamp
        await this.redis.set(timestampKey, timestamp.toString(), 'EX', 3600); // Keep for 1 hour

        return true;
      } catch (error) {
        this.logger.error(
          `Error in ordered processing for ${deviceId}: ${error.message}`,
          error.stack,
        );
        return false;
      } finally {
        await this.redis.del(lockKey);
      }
    } catch (error) {
      this.logger.error(
        `Redis error in processOrdered: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Helper function to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
