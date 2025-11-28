import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { SimpleUniversalMqttService } from './services/simple-universal-mqtt.service';
import { ActivityAction, ActivityEntityType } from 'src/activity-log/entities/activity-log.enum';
import type { LoggedResponse } from 'src/common/type/log.response';

@Controller('mqtt')
export class MqttController {
  private readonly logger = new Logger(MqttController.name);

  constructor(private readonly simpleUniversalMqttService: SimpleUniversalMqttService) {}

  /**
   * Check MQTT connection status
   */
  @Get('status')
  getStatus() {
    const connected = this.simpleUniversalMqttService.isConnected();
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
  sendTestMessage(@Body() body: { deviceId?: string; topic?: string; data?: any }): LoggedResponse<any> {
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
    console.log('Sending test MQTT message', { topic, data });
    this.logger.log(`📤 Sending test message to topic: ${topic}`);
    this.logger.log(`   Data: ${JSON.stringify(data)}`);

    const success = this.simpleUniversalMqttService.publishCommand(`TRUOC-MM-01`, deviceId, data);

    return {
      data: {
        success,
        topic,
        data,
        timestamp: new Date().toISOString(),
      },
      log: {
        action: 'TEST_MQTT_PUBLISH_ONCE' as ActivityAction,
        actionType: 'TEST_MQTT_PUBLISH_ONCE' as ActivityAction,
        entityType: ActivityEntityType.Device,
        description: `Gửi bản tin MQTT test tới thiết bị ${deviceId}`,
        meta: { topic },
      },
    };
  }

  /**
   * Send continuous test messages
   */
  @Post('test/continuous')
  async sendContinuousTestMessages(
    @Body() body: { deviceId?: string; count?: number; interval?: number }
  ): Promise<LoggedResponse<any>> {
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

      const success = this.simpleUniversalMqttService.publishCommand(`TRUOC-MM-01`, deviceId, data);
      results.push({ index: i, success, timestamp: new Date().toISOString() });

      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    return {
      data: {
        deviceId,
        totalSent: count,
        results,
        timestamp: new Date().toISOString(),
      },
      log: {
        action: 'TEST_MQTT_PUBLISH_CONTINUOUS' as ActivityAction,
        actionType: 'TEST_MQTT_PUBLISH_CONTINUOUS' as ActivityAction,
        entityType: ActivityEntityType.Device,
        description: `Gửi ${count} bản tin MQTT test liên tiếp cho thiết bị ${deviceId}`,
      },
    };
  }
}
