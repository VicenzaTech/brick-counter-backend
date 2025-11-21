/**
 * Base Cluster Handler
 * Abstract class chứa logic chung cho tất cả cluster handlers
 */

import { Injectable, Logger } from '@nestjs/common';
import { MqttClient } from 'mqtt';
import { ClusterHandler } from '../interfaces/cluster-handler.interface';

@Injectable()
export abstract class BaseClusterHandler implements ClusterHandler {
  protected readonly logger: Logger;
  protected mqttClient: MqttClient;

  abstract readonly clusterCode: string;

  constructor(clusterCode: string) {
    this.logger = new Logger(`${clusterCode}Handler`);
  }

  /**
   * Set MQTT client để có thể publish messages
   */
  setMqttClient(client: MqttClient): void {
    this.mqttClient = client;
  }

  /**
   * Xử lý telemetry - phải được override bởi subclass
   */
  abstract handleTelemetry(deviceId: string, message: any): Promise<void>;

  /**
   * Xử lý status - có thể override nếu cần logic riêng
   */
  async handleStatus(deviceId: string, message: any): Promise<void> {
    this.logger.log(`Status update from ${deviceId}: ${JSON.stringify(message)}`);
    // Default: chỉ log, subclass có thể override để update database
  }

  /**
   * Validate payload - phải được override bởi subclass
   */
  abstract validatePayload(message: any): boolean;

  /**
   * Publish command tới device cụ thể
   */
  async publishCommand(deviceId: string, command: any): Promise<void> {
    if (!this.mqttClient) {
      throw new Error('MQTT client not initialized');
    }

    const topic = `devices/${this.clusterCode}/${deviceId}/cmd`;
    const payload = JSON.stringify({
      ...command,
      timestamp: new Date().toISOString(),
    });

    return new Promise((resolve, reject) => {
      this.mqttClient.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`Failed to publish to ${topic}: ${error.message}`);
          reject(error);
        } else {
          this.logger.log(`Published command to ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Broadcast command tới tất cả devices trong cluster
   */
  async broadcastCommand(command: any): Promise<void> {
    if (!this.mqttClient) {
      throw new Error('MQTT client not initialized');
    }

    const topic = `clusters/${this.clusterCode}/cmd`;
    const payload = JSON.stringify({
      ...command,
      timestamp: new Date().toISOString(),
    });

    return new Promise((resolve, reject) => {
      this.mqttClient.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`Failed to broadcast to ${topic}: ${error.message}`);
          reject(error);
        } else {
          this.logger.log(`Broadcasted command to cluster ${this.clusterCode}`);
          resolve();
        }
      });
    });
  }

  /**
   * Helper: Safe parse JSON
   */
  protected safeParseJson<T>(json: string, defaultValue: T): T {
    try {
      return JSON.parse(json) as T;
    } catch (error) {
      this.logger.error(`Failed to parse JSON: ${error.message}`);
      return defaultValue;
    }
  }

  /**
   * Helper: Validate required fields
   */
  protected hasRequiredFields(obj: any, fields: string[]): boolean {
    return fields.every((field) => {
      const value = field.split('.').reduce((o, key) => o?.[key], obj);
      return value !== undefined && value !== null;
    });
  }
}
