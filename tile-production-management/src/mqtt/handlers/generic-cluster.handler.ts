/**
 * Generic Cluster Handler
 * Handler tổng quát có thể xử lý mọi loại sensor/cluster
 * Config-driven approach - tất cả logic dựa trên config từ DB
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MqttClient } from 'mqtt';
import { Device } from '../../devices/entities/device.entity';

/**
 * Cluster Configuration
 * Load từ database hoặc config file
 */
export interface ClusterConfig {
  code: string;              // BR, TEMP, HM, ...
  name: string;              // Display name
  measurementTypeId: number; // Link to measurement_types table
  
  // Data schema validation
  requiredFields: string[];  // ['data.count', 'data.error']
  
  // Data processing
  dataMapping?: {            // Map MQTT field -> DB field
    [mqttField: string]: string;
  };
  
  // Storage strategy
  storageStrategy: 'telemetry' | 'measurements' | 'both';
  
  // WebSocket config
  wsNamespace: string;       // '/ws/BR'
  wsRoomFields: string[];    // ['device_id', 'position.productionLine.id']
}

@Injectable()
export class GenericClusterHandler {
  private readonly logger: Logger;
  private mqttClient: MqttClient;
  
  // Cluster configurations - load from DB
  private clusterConfigs = new Map<string, ClusterConfig>();
  
  // WebSocket gateways registry
  private wsGateways = new Map<string, any>();

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {
    this.logger = new Logger('GenericClusterHandler');
  }

  /**
   * Initialize - Load cluster configs from database
   */
  async initialize(): Promise<void> {
    // TODO: Load from database when tables are ready
    // const clusters = await this.clusterRepository.find({
    //   relations: ['measurementType'],
    // });
    
    // For now, use hardcoded configs
    this.loadDefaultConfigs();
    
    this.logger.log(`✅ Loaded ${this.clusterConfigs.size} cluster configurations`);
  }

  /**
   * Load default cluster configurations
   */
  private loadDefaultConfigs(): void {
    // Brick Counter Config
    this.clusterConfigs.set('BR', {
      code: 'BR',
      name: 'Brick Counter',
      measurementTypeId: 1,
      requiredFields: ['device_id', 'data.count', 'data.error'],
      dataMapping: {
        'data.count': 'count',
        'data.error': 'errCount',
        'data.rssi': 'rssi',
        'data.battery': 'battery',
        'data.temperature': 'temperature',
      },
      storageStrategy: 'telemetry', // Use device_telemetry table
      wsNamespace: '/ws/BR',
      wsRoomFields: ['device_id', 'position.productionLine.id', 'position.id'],
    });

    // Temperature Sensor Config
    this.clusterConfigs.set('TEMP', {
      code: 'TEMP',
      name: 'Temperature Sensor',
      measurementTypeId: 2,
      requiredFields: ['device_id', 'data.temperature'],
      dataMapping: {
        'data.temperature': 'temperature',
        'data.humidity': 'humidity',
        'data.heat_index': 'heatIndex',
      },
      storageStrategy: 'measurements', // Use measurements table (time-series)
      wsNamespace: '/ws/TEMP',
      wsRoomFields: ['device_id', 'position.id'],
    });

    // Humidity Sensor Config
    this.clusterConfigs.set('HM', {
      code: 'HM',
      name: 'Humidity Sensor',
      measurementTypeId: 3,
      requiredFields: ['device_id', 'data.humidity'],
      dataMapping: {
        'data.humidity': 'humidity',
        'data.temperature': 'temperature',
        'data.dew_point': 'dewPoint',
      },
      storageStrategy: 'measurements',
      wsNamespace: '/ws/HM',
      wsRoomFields: ['device_id'],
    });
  }

  /**
   * Register WebSocket gateway for cluster
   */
  registerWebSocketGateway(clusterCode: string, gateway: any): void {
    this.wsGateways.set(clusterCode, gateway);
    this.logger.log(`📡 Registered WebSocket gateway for cluster: ${clusterCode}`);
  }

  /**
   * Set MQTT client
   */
  setMqttClient(client: MqttClient): void {
    this.mqttClient = client;
  }

  /**
   * Handle telemetry message - GENERIC
   */
  async handleTelemetry(clusterCode: string, deviceId: string, message: any): Promise<void> {
    try {
      const config = this.clusterConfigs.get(clusterCode);
      
      if (!config) {
        this.logger.warn(`No config found for cluster: ${clusterCode}`);
        return;
      }

      // Validate payload
      if (!this.validatePayload(message, config)) {
        this.logger.warn(`Invalid payload for ${clusterCode}/${deviceId}`);
        return;
      }

      this.logger.log(`📊 ${config.name} Telemetry - Device: ${deviceId}`);
      this.logger.debug(`   Data: ${JSON.stringify(message.data)}`);

      // Get device info
      const device = await this.getDeviceWithRelations(deviceId);
      if (!device) {
        this.logger.warn(`Device ${deviceId} not found in database`);
        return;
      }

      // Save to database based on storage strategy
      await this.saveData(clusterCode, deviceId, message, device, config);

      // Broadcast via WebSocket
      await this.broadcastToWebSocket(clusterCode, deviceId, message, device, config);

      this.logger.log(`✅ Processed ${config.name} telemetry for ${deviceId}`);

    } catch (error) {
      this.logger.error(
        `Error handling telemetry for ${clusterCode}/${deviceId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle status message - GENERIC
   */
  async handleStatus(clusterCode: string, deviceId: string, message: any): Promise<void> {
    try {
      const config = this.clusterConfigs.get(clusterCode);
      
      if (!config) {
        this.logger.warn(`No config found for cluster: ${clusterCode}`);
        return;
      }

      this.logger.log(`🔔 ${config.name} Status - Device: ${deviceId}, Status: ${message.status}`);

      // Update device status in database
      // TODO: Implement based on storage strategy

      // Broadcast status via WebSocket
      const gateway = this.wsGateways.get(clusterCode);
      if (gateway && gateway.broadcastStatus) {
        const rooms = this.generateRooms(deviceId, null, config);
        gateway.broadcastStatus(rooms, {
          device_id: deviceId,
          status: message.status,
          timestamp: message.timestamp || new Date().toISOString(),
        });
      }

    } catch (error) {
      this.logger.error(`Error handling status: ${error.message}`, error.stack);
    }
  }

  /**
   * Validate payload based on config
   */
  private validatePayload(message: any, config: ClusterConfig): boolean {
    return config.requiredFields.every((field) => {
      const value = this.getNestedValue(message, field);
      return value !== undefined && value !== null;
    });
  }

  /**
   * Save data to database based on storage strategy
   */
  private async saveData(
    clusterCode: string,
    deviceId: string,
    message: any,
    device: Device,
    config: ClusterConfig,
  ): Promise<void> {
    switch (config.storageStrategy) {
      case 'telemetry':
        await this.saveTelemetryData(deviceId, message, device, config);
        break;
      
      case 'measurements':
        await this.saveMeasurementData(deviceId, message, device, config);
        break;
      
      case 'both':
        await Promise.all([
          this.saveTelemetryData(deviceId, message, device, config),
          this.saveMeasurementData(deviceId, message, device, config),
        ]);
        break;
    }
  }

  /**
   * Save to device_telemetry table (for backward compatibility)
   */
  private async saveTelemetryData(
    deviceId: string,
    message: any,
    device: Device,
    config: ClusterConfig,
  ): Promise<void> {
    // TODO: Inject telemetry repository
    // For now, just log
    this.logger.debug(`Would save to telemetry table: ${deviceId}`);
    
    // const mappedData = this.mapData(message.data, config.dataMapping);
    // await this.telemetryRepository.upsert({
    //   deviceId,
    //   ...mappedData,
    //   lastMessageAt: new Date(message.timestamp),
    // });
  }

  /**
   * Save to measurements table (time-series)
   */
  private async saveMeasurementData(
    deviceId: string,
    message: any,
    device: Device,
    config: ClusterConfig,
  ): Promise<void> {
    // TODO: Inject measurements repository when table is ready
    this.logger.debug(`Would save to measurements table: ${deviceId}`);
    
    // await this.measurementRepository.insert({
    //   device_id: device.id,
    //   cluster_id: device.clusterId,
    //   type_id: config.measurementTypeId,
    //   timestamp: new Date(message.timestamp),
    //   data: message.data,
    // });
  }

  /**
   * Broadcast to WebSocket
   */
  private async broadcastToWebSocket(
    clusterCode: string,
    deviceId: string,
    message: any,
    device: Device,
    config: ClusterConfig,
  ): Promise<void> {
    const gateway = this.wsGateways.get(clusterCode);
    
    if (!gateway || !gateway.broadcastTelemetry) {
      this.logger.debug(`No WebSocket gateway for cluster: ${clusterCode}`);
      return;
    }

    // Generate rooms based on config
    const rooms = this.generateRooms(deviceId, device, config);

    // Prepare WebSocket payload
    const wsPayload = {
      device_id: deviceId,
      cluster_code: clusterCode,
      timestamp: message.timestamp || new Date().toISOString(),
      ...message.data,
    };

    // Broadcast
    gateway.broadcastTelemetry(rooms, wsPayload);
    this.logger.debug(`📡 Broadcasted to ${rooms.length} room(s)`);
  }

  /**
   * Generate WebSocket rooms based on config
   */
  private generateRooms(deviceId: string, device: Device | null, config: ClusterConfig): string[] {
    const rooms = [`device:${deviceId}`, `cluster:${config.code}`];

    if (!device) {
      return rooms;
    }

    config.wsRoomFields.forEach((field) => {
      const value = this.getNestedValue(device, field);
      if (value !== undefined && value !== null) {
        const roomType = field.split('.').pop(); // 'productionLine.id' -> 'id'
        const roomPrefix = field.includes('productionLine') ? 'line' : field.replace('.id', '');
        rooms.push(`${roomPrefix}:${value}`);
      }
    });

    return rooms;
  }

  /**
   * Get device with relations
   */
  private async getDeviceWithRelations(deviceId: string): Promise<Device | null> {
    return this.deviceRepository.findOne({
      where: { deviceId },
      relations: ['position', 'position.productionLine'],
    });
  }

  /**
   * Map data fields based on config
   */
  private mapData(sourceData: any, mapping?: { [key: string]: string }): any {
    if (!mapping) {
      return sourceData;
    }

    const mapped: any = {};
    
    Object.entries(mapping).forEach(([mqttField, dbField]) => {
      const value = this.getNestedValue({ data: sourceData }, mqttField);
      if (value !== undefined) {
        mapped[dbField] = value;
      }
    });

    return mapped;
  }

  /**
   * Get nested value from object (e.g., 'data.count')
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Publish command to specific device - GENERIC
   */
  async publishCommand(clusterCode: string, deviceId: string, command: any): Promise<void> {
    if (!this.mqttClient) {
      throw new Error('MQTT client not initialized');
    }

    const topic = `devices/${clusterCode}/${deviceId}/cmd`;
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
   * Broadcast command to all devices in cluster - GENERIC
   */
  async broadcastCommand(clusterCode: string, command: any): Promise<void> {
    if (!this.mqttClient) {
      throw new Error('MQTT client not initialized');
    }

    const topic = `clusters/${clusterCode}/cmd`;
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
          this.logger.log(`Broadcasted command to cluster ${clusterCode}`);
          resolve();
        }
      });
    });
  }

  /**
   * Get cluster config
   */
  getClusterConfig(clusterCode: string): ClusterConfig | undefined {
    return this.clusterConfigs.get(clusterCode);
  }

  /**
   * Get all cluster codes
   */
  getRegisteredClusters(): string[] {
    return Array.from(this.clusterConfigs.keys());
  }

  /**
   * Reload cluster configs from database
   */
  async reloadConfigs(): Promise<void> {
    this.logger.log('🔄 Reloading cluster configs...');
    
    // TODO: Load from database
    // const clusters = await this.clusterRepository.find({
    //   relations: ['measurementType'],
    // });
    
    // this.clusterConfigs.clear();
    // clusters.forEach(cluster => {
    //   this.clusterConfigs.set(cluster.code, {
    //     code: cluster.code,
    //     name: cluster.name,
    //     measurementTypeId: cluster.measurement_type_id,
    //     requiredFields: cluster.config?.requiredFields || [],
    //     dataMapping: cluster.config?.dataMapping,
    //     storageStrategy: cluster.config?.storageStrategy || 'measurements',
    //     wsNamespace: `/ws/${cluster.code}`,
    //     wsRoomFields: cluster.config?.wsRoomFields || ['device_id'],
    //   });
    // });
    
    this.loadDefaultConfigs();
    this.logger.log(`✅ Reloaded ${this.clusterConfigs.size} cluster configs`);
  }
}
