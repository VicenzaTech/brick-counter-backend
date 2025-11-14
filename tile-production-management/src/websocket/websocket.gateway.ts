/**
 * WebSocket Gateway
 * Gateway để broadcast real-time data đến frontend clients
 * 
 * Tương tự websocket_service/websocket_client.py và channels trong Django
 */
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceTelemetry } from '../devices/entities/device-telemetry.entity';

interface BroadcastMessage {
  element_id: string;
  value: any;
  type: 'text' | 'number' | 'json';
}

@WebSocketGateway({
  cors: {
    origin: '*', // Cấu hình CORS cho phép mọi origin (có thể giới hạn trong production)
  },
})
export class WebSocketGatewayService
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGatewayService.name);

  // Track connected clients by room
  private connectedClients: Map<string, Set<string>> = new Map();

  constructor(
    @InjectRepository(DeviceTelemetry)
    private readonly telemetryRepository: Repository<DeviceTelemetry>,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    this.logger.log('Socket.IO server is ready to accept connections');
  }

  handleConnection(client: Socket) {
    this.logger.log(`✅ Client connected: ${client.id}`);
    
    // Auto join client to 'devices' room by default
    client.join('devices');
    if (!this.connectedClients.has('devices')) {
      this.connectedClients.set('devices', new Set());
    }
    this.connectedClients.get('devices')!.add(client.id);
    this.logger.log(`Client ${client.id} auto-joined room: devices`);
    
    // Emit initial telemetry data from database
    this.sendInitialTelemetryData(client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Client disconnected: ${client.id}`);
    
    // Remove client from all rooms
    this.connectedClients.forEach((clients, room) => {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.connectedClients.delete(room);
      }
    });
  }

  /**
   * Handle join room request from client
   */
  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ): void {
    this.logger.log(`📥 Client ${client.id} requesting to join room: ${room}`);
    this.joinRoom(client.id, room);
    
    // Send confirmation back to client
    client.emit('joined_room', { room, status: 'success' });
  }

  /**
   * Handle leave room request from client
   */
  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ): void {
    this.logger.log(`📤 Client ${client.id} requesting to leave room: ${room}`);
    this.leaveRoom(client.id, room);
    
    // Send confirmation back to client
    client.emit('left_room', { room, status: 'success' });
  }

  /**
   * Handle generic message from client
   */
  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ): void {
    this.logger.log(`📨 Message from client ${client.id}:`, data);
  }

  /**
   * Broadcast message to a specific room/channel
   * Tương tự channels_service.broadcast() trong Django
   */
  broadcast(room: string, eventType: string, data: any): void {
    try {
      const roomSize = this.getRoomSize(room);
      this.logger.log(`📡 Broadcasting '${eventType}' to room '${room}' (${roomSize} clients)`);
      this.server.to(room).emit(eventType, data);
      this.logger.debug(`✅ Broadcast successful: ${eventType} to ${room}`);
    } catch (error) {
      this.logger.error(
        `❌ Error broadcasting to room ${room}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastToAll(eventType: string, data: any): void {
    try {
      this.server.emit(eventType, data);
      this.logger.debug(`Broadcast to all: ${eventType}`);
    } catch (error) {
      this.logger.error(
        `Error broadcasting to all: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Join client to a specific room
   */
  joinRoom(clientId: string, room: string): void {
    const client = this.server.sockets.sockets.get(clientId);
    if (client) {
      client.join(room);
      
      // Track client in room
      if (!this.connectedClients.has(room)) {
        this.connectedClients.set(room, new Set());
      }
      this.connectedClients.get(room)!.add(clientId);
      
      this.logger.log(`Client ${clientId} joined room: ${room}`);
    }
  }

  /**
   * Leave client from a specific room
   */
  leaveRoom(clientId: string, room: string): void {
    const client = this.server.sockets.sockets.get(clientId);
    if (client) {
      client.leave(room);
      
      // Remove client from room tracking
      const clients = this.connectedClients.get(room);
      if (clients) {
        clients.delete(clientId);
        if (clients.size === 0) {
          this.connectedClients.delete(room);
        }
      }
      
      this.logger.log(`Client ${clientId} left room: ${room}`);
    }
  }

  /**
   * Broadcast device data update
   * Tương tự broadcast_message trong Django tong_quan app
   */
  broadcastDeviceUpdate(deviceId: string, data: any): void {
    const roomSize = this.getRoomSize('devices');
    this.logger.log(`📱 Broadcasting device update for: ${deviceId} to ${roomSize} clients`);
    this.logger.debug(`   Data: ${JSON.stringify(data).substring(0, 100)}`);
    this.broadcast('devices', 'device_update', {
      deviceId,
      ...data,
    });
  }

  /**
   * Broadcast production update
   */
  broadcastProductionUpdate(data: any): void {
    this.broadcast('production', 'production_update', data);
  }

  /**
   * Broadcast batch device updates
   * Tương tự batch updates trong tong_quan_mqtt_handler
   */
  broadcastBatchDeviceUpdate(devices: Record<string, any>): void {
    this.broadcast('devices', 'batch_device_update', devices);
  }

  /**
   * Get number of connected clients in a room
   */
  getRoomSize(room: string): number {
    return this.connectedClients.get(room)?.size || 0;
  }

  /**
   * Get all rooms
   */
  getRooms(): string[] {
    return Array.from(this.connectedClients.keys());
  }

  /**
   * Send initial telemetry data from database to newly connected client
   */
  private async sendInitialTelemetryData(client: Socket): Promise<void> {
    try {
      this.logger.log(`📤 Sending initial telemetry data to client ${client.id}`);
      
      // Fetch all latest telemetry from database
      const telemetryData = await this.telemetryRepository.find({
        order: {
          lastMessageAt: 'DESC',
        },
      });

      if (telemetryData && telemetryData.length > 0) {
        // Format data for frontend
        const initialData = telemetryData.map(t => ({
          deviceId: t.deviceId,
          count: t.count || 0,
          errCount: t.errCount || 0,
          rssi: t.rssi || 0,
          status: t.status,
          battery: t.battery,
          temperature: t.temperature,
          uptime: t.uptime,
          timestamp: t.lastMessageAt?.toISOString() || new Date().toISOString(),
        }));

        // Emit to specific client
        client.emit('initial_telemetry', initialData);
        this.logger.log(`✅ Sent ${initialData.length} telemetry records to client ${client.id}`);
      } else {
        this.logger.log(`ℹ️ No telemetry data found in database`);
        client.emit('initial_telemetry', []);
      }
    } catch (error) {
      this.logger.error(`❌ Error sending initial telemetry: ${error.message}`, error.stack);
      client.emit('initial_telemetry', []);
    }
  }
}
