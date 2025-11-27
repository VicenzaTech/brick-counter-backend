/**
 * Simple Universal WebSocket Service
 * Tạo namespace động cho mọi cluster - broadcast raw data
 * 
 * Luồng xử lý:
 * 1. onModuleInit() → Tạo gateways cho tất cả clusters
 * 2. afterInit(server) → setServer(io) → Initialize gateways với Socket.IO server
 * 3. Handler register gateway → Có thể broadcast data
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Server } from 'socket.io';
import { GenericWebSocketGateway } from '../gateways/generic-websocket.gateway';
import { SimpleUniversalHandler } from '../../mqtt/handlers/simple-universal.handler';

@Injectable()
export class SimpleUniversalWebSocketService implements OnModuleInit {
  private readonly logger = new Logger(SimpleUniversalWebSocketService.name);
  private io: Server;
  private gateways = new Map<string, GenericWebSocketGateway>();
  
  // List of clusters - có thể load từ DB hoặc hardcode
  private clusters = ['BR', 'TEMP', 'HM', 'mdg'];

  constructor(
    private readonly handler: SimpleUniversalHandler,
  ) {}

  /**
   * Module initialization - tạo gateways cho tất cả clusters
   * Gateways sẽ được initialize sau khi Socket.IO server ready
   */
  async onModuleInit() {
    this.logger.log(`🚀 Initializing WebSocket service with clusters: ${this.clusters.join(', ')}`);
    
    // Create gateways for all clusters
    this.clusters.forEach((clusterCode) => {
      this.createGateway(clusterCode);
    });
  }

  /**
   * Set Socket.IO server - được gọi từ SimpleUniversalWebSocketGateway.afterInit()
   * Lúc này gateways đã được tạo, chỉ cần initialize với server
   */
  setServer(io: Server): void {
    this.io = io;
    this.logger.debug(`🔌 Setting WebSocket server, initializing ${this.gateways.size} gateways...`);

    // Initialize all existing gateways với Socket.IO server
    let initializedCount = 0;
    this.gateways.forEach((gateway, clusterCode) => {
      try {
        gateway.initialize(io);
        initializedCount++;
        this.logger.debug(`✅ Initialized gateway for cluster: ${clusterCode}`);
      } catch (error) {
        this.logger.error(`❌ Failed to initialize gateway for cluster ${clusterCode}:`, error);
      }
    });
    
    this.logger.log(`✅ WebSocket server initialized with ${initializedCount}/${this.gateways.size} namespaces`);
  }

  /**
   * Create gateway for cluster
   * Gọi từ onModuleInit() hoặc addCluster()
   */
  private createGateway(clusterCode: string): void {
    const namespace = `/ws/${clusterCode}`;
    const gateway = new GenericWebSocketGateway(namespace, clusterCode);
    
    this.logger.debug(`Creating gateway for namespace: ${namespace}`, {
      hasIo: !!this.io,
      clusterCode
    });

    // Register with handler - handler sẽ dùng gateway này để broadcast
    this.handler.registerGateway(namespace, gateway);
    
    // Store gateway locally
    this.gateways.set(clusterCode, gateway);
    
    // Initialize immediately if server exists (dynamic add cluster)
    if (this.io) {
      this.logger.debug(`Initializing gateway for namespace: ${namespace}`);
      gateway.initialize(this.io);
    } else {
      this.logger.warn(`WebSocket server not available during gateway creation for ${namespace}. Will be initialized when server is set.`);
    }
    
    this.logger.log(`📡 Created gateway: ${namespace}`);
  }

  /**
   * Add cluster dynamically at runtime
   */
  addCluster(clusterCode: string): void {
    if (!this.clusters.includes(clusterCode)) {
      this.clusters.push(clusterCode);
      this.createGateway(clusterCode);
      this.logger.log(`➕ Added cluster: ${clusterCode}`);
    } else {
      this.logger.warn(`Cluster ${clusterCode} already exists`);
    }
  }

  /**
   * Get gateway for cluster
   */
  getGateway(clusterCode: string): GenericWebSocketGateway | undefined {
    return this.gateways.get(clusterCode);
  }

  /**
   * Get all namespaces
   */
  getNamespaces(): string[] {
    return this.clusters.map(c => `/ws/${c}`);
  }

  /**
   * Get stats for all namespaces
   */
  getAllStats(): Map<string, { clientCount: number; rooms: Map<string, number> }> {
    const stats = new Map();

    this.gateways.forEach((gateway, clusterCode) => {
      stats.set(clusterCode, {
        clientCount: gateway.getConnectedClientCount(),
        rooms: gateway.getRoomStats(),
      });
    });

    return stats;
  }
}
