import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { MqttService } from './mqtt.service';

@Controller('mqtt')
export class MqttController {
  private readonly logger = new Logger(MqttController.name);

  constructor(private readonly mqttService: MqttService) {}

  /**
   * Check MQTT connection status
   */
  @Get('status')
  getStatus() {
    const connected = this.mqttService.isConnected();
    this.logger.log(`MQTT Status check: ${connected ? 'Connected' : 'Disconnected'}`);
    return {
      connected,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send test message to MQTT broker
   */
  @Post('test')
  sendTestMessage(@Body() body: { deviceId?: string; topic?: string; data?: any }) {
    const deviceId = body.deviceId || 'test_device_001';
    const topic = body.topic || `devices/${deviceId}/telemetry`;
    const data = body.data || {
      deviceId,
      ts: new Date().toISOString(),
      metrics: {
        count: Math.floor(Math.random() * 1000),
        err_count: Math.floor(Math.random() * 10),
      },
      quality: {
        rssi: -50 - Math.floor(Math.random() * 30),
      },
    };

    this.logger.log(`📤 Sending test message to topic: ${topic}`);
    this.logger.log(`   Data: ${JSON.stringify(data)}`);

    const success = this.mqttService.publishMessage(topic, data, { qos: 1 });

    return {
      success,
      topic,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send continuous test messages
   */
  @Post('test/continuous')
  async sendContinuousTestMessages(
    @Body() body: { deviceId?: string; count?: number; interval?: number }
  ) {
    const deviceId = body.deviceId || 'test_device_001';
    const count = body.count || 10;
    const interval = body.interval || 1000; // ms

    this.logger.log(`📤 Sending ${count} test messages for device ${deviceId} with ${interval}ms interval`);

    const results: any[] = [];
    
    for (let i = 0; i < count; i++) {
      const topic = `devices/${deviceId}/telemetry`;
      const data = {
        deviceId,
        ts: new Date().toISOString(),
        metrics: {
          count: 100 + i * 10,
          err_count: i % 5,
        },
        quality: {
          rssi: -50 - Math.floor(Math.random() * 30),
        },
      };

      const success = this.mqttService.publishMessage(topic, data, { qos: 1 });
      results.push({ index: i, success, timestamp: new Date().toISOString() });

      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    return {
      deviceId,
      totalSent: count,
      results,
      timestamp: new Date().toISOString(),
    };
  }
}
