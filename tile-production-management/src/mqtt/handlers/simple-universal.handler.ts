/**
 * Simple Universal Handler
 * 1 handler duy nhất xử lý RAW DATA cho MỌI loại sensor
 * Không cần config phức tạp - chỉ lưu và broadcast raw data
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MqttClient } from 'mqtt';
import { Device } from '../../devices/entities/device.entity';
import { Measurement } from '../../measurement/entities/measurement.entity';
import { MeasurementService } from '../../measurement/measurement.service';

@Injectable()
export class SimpleUniversalHandler {
    private readonly logger = new Logger('UniversalHandler');
    private mqttClient: MqttClient;

    // WebSocket gateways registry - key là namespace
    private wsGateways = new Map<string, any>();

    // ⭐ Active devices tracking - chỉ process telemetry cho devices đang production
    private activeDevices = new Set<string>(); // Set of deviceIds that are currently in production

    constructor(
        @InjectRepository(Device)
        private readonly deviceRepository: Repository<Device>,
        @InjectRepository(Measurement)
        private readonly measurementRepository: Repository<Measurement>,
        private readonly measurementService: MeasurementService,
    ) { }

    /**
     * Register WebSocket gateway cho namespace
     */
    registerGateway(namespace: string, gateway: any): void {
        this.wsGateways.set(namespace, gateway);
        this.logger.log(`📡 Registered gateway: ${namespace}`);
    }

    /**
     * Set MQTT client
     */
    setMqttClient(client: MqttClient): void {
        this.mqttClient = client;
    }

    /**
     * ⭐ Activate devices - bắt đầu lưu telemetry cho các devices này
     */
    activateDevices(deviceIds: string[]): void {
        deviceIds.forEach(id => this.activeDevices.add(id));
        this.logger.log(`✅ Activated ${deviceIds.length} devices for telemetry: ${deviceIds.join(', ')}`);
        this.logger.log(`📊 Total active devices: ${this.activeDevices.size}`);
    }

    /**
     * ⭐ Deactivate devices - ngừng lưu telemetry
     */
    deactivateDevices(deviceIds: string[]): void {
        deviceIds.forEach(id => this.activeDevices.delete(id));
        this.logger.log(`🛑 Deactivated ${deviceIds.length} devices: ${deviceIds.join(', ')}`);
        this.logger.log(`📊 Remaining active devices: ${this.activeDevices.size}`);
    }

    /**
     * ⭐ Deactivate all devices
     */
    deactivateAllDevices(): void {
        const count = this.activeDevices.size;
        this.activeDevices.clear();
        this.logger.log(`🛑 Deactivated all ${count} devices`);
    }

    /**
     * Get active devices count
     */
    getActiveDevicesCount(): number {
        return this.activeDevices.size;
    }

    /**
     * Check if device is active
     */
    isDeviceActive(deviceId: string): boolean {
        return this.activeDevices.has(deviceId);
    }

    /**
     * Handle telemetry - SIMPLE, chỉ lưu raw data
     */

    decodeInsidentMessage = (payload) => {
        const text = payload.toString('utf8');
        const json = JSON.parse(text);
        return json
    }
    async handleTelemetry(topic: string, message: any): Promise<void> {
        try {
            // Parse topic: devices/{cluster}/{device_id}/telemetry
            const saveMessage = this.decodeInsidentMessage(message)

            const parts = topic.split('/');
            const partIndex = 1
            const clusterCode = parts[partIndex]; // ADD CLUSTER_CODE TO DEVICE ENTITY **
            const deviceId = parts[partIndex + 1]; //cluster code consider not need

            // ⭐ CHECK: Chỉ xử lý telemetry cho devices đang active (trong production)
            if (!this.activeDevices.has(deviceId)) {
                // this.logger.debug(`⏭️ Skipping telemetry for inactive device: ${deviceId}`);
                return;
            }

            // Log realtime data cho active device
            this.logger.log(`📊 [ACTIVE] ${deviceId} - Data: ${JSON.stringify(saveMessage).substring(0, 150)}...`);

            // Get device info (để lấy ID và relations)
            const device = await this.deviceRepository.findOne({
                where: { deviceId },
            });

            if (!device) {
                this.logger.warn(`Device ${deviceId} not found in database`);
                return;
            }

            // this.logger.log(`🔄 Processing telemetry for ${deviceId} (cluster=${clusterCode}), calling saveRawData...`);

            // Save RAW data to measurements table
            await this.measurementService.ingest({
                data: saveMessage,
                deviceId: deviceId,
                timestamp: saveMessage.ts ?? new Date().toISOString(),
            })

            // Broadcast RAW data via WebSocket
            this.broadcastRawData(clusterCode, deviceId, device, saveMessage);

            this.logger.log(`✅ Saved & broadcasted telemetry for ${deviceId}`);

        } catch (error) {
            this.logger.error(
                `Error handling telemetry: ${error.message}`,
                error.stack,
            );
        }
    }

    /**
     * Handle status - SIMPLE
     */
    async handleStatus(topic: string, message: any): Promise<void> {
        try {
            const parts = topic.split('/');
            const clusterCode = parts[1];
            const deviceId = parts[2];

            this.logger.log(`🔔 [${clusterCode}] Status from ${deviceId}: ${message.status}`);

            // Broadcast status
            const namespace = `/ws/${clusterCode}`;
            const gateway = this.wsGateways.get(namespace);

            if (gateway?.broadcastStatus) {
                gateway.broadcastStatus(
                    [`device:${deviceId}`, `cluster:${clusterCode}`],
                    {
                        device_id: deviceId,
                        cluster_code: clusterCode,
                        status: message.status,
                        timestamp: message.timestamp || new Date().toISOString(),
                    }
                );
            }

        } catch (error) {
            this.logger.error(`Error handling status: ${error.message}`, error.stack);
        }
    }

    /**
     * Save raw data to measurements table (time-series)
     */
    private async saveRawData(
        device: Device,
        clusterCode: string,
        message: any,
    ): Promise<void> {
        if (!message || !message.data || typeof message.data !== 'object') {
            this.logger.warn(`Invalid or empty telemetry payload for device ${device.deviceId}. Skipping ingest.`);
            return;
        }

        this.logger.log(`💾 Saving raw data for device ${device.deviceId} (cluster=${clusterCode})...`);

        await this.measurementService.ingest({
            deviceId: device.deviceId,
            data: message.data,
            timestamp: message.timestamp ? new Date(message.timestamp) : undefined,
        });

        this.logger.log(`✅ Saved raw data for device ${device.deviceId}`);
    }

    /**
     * Broadcast raw data via WebSocket
     */
    private broadcastRawData(
        clusterCode: string,
        deviceId: string,
        device: Device,
        message: Buffer,
    ): void {
        // Use provided clusterCode and lookup namespace
        // const namespace = `/ws/${clusterCode}`;
        const namespace = '/ws/' + clusterCode;

        const gateway = this.wsGateways.get(namespace);
        this.logger.debug(`Looking up gateway for namespace: ${namespace}`);

        if (!gateway?.broadcastTelemetry) {
            this.logger.debug(`No gateway for namespace: ${namespace}`);
            return;
        }

        // Generate rooms
        const rooms = [
            `device:${deviceId}`,
            `cluster:${clusterCode}`,
        ];

        this.logger.debug("DEVICE POSITION", device.position);
        if (device.position?.productionLine?.id) {
            rooms.push(`line:${device.position.productionLine.id}`);
        }

        if (device.position?.id) {
            rooms.push(`position:${device.position.id}`);
        }

        const payload = {
            device_id: deviceId,
            cluster_code: clusterCode,
            timestamp: (message as any).ts || new Date().toISOString(),
            ...message,  // Spread raw data
        };
        this.logger.verbose(`BROADCARD PAYLOAD --- `, payload)
        gateway.broadcastTelemetry(rooms, payload);
        this.logger.debug(`📡 Broadcasted to ${rooms.length} room(s)`);
    }

    /**
     * Publish command to device - SIMPLE
     */
    async publishCommand(
        clusterCode: string,
        deviceId: string,
        command: any,
    ): Promise<void> {
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
     * Broadcast command to cluster - SIMPLE
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
                    this.logger.log(`Broadcasted to cluster ${clusterCode}`);
                    resolve();
                }
            });
        });
    }
}
