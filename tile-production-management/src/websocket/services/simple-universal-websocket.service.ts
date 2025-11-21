/**
 * Simple Universal WebSocket Service
 * Tạo namespace động cho mọi cluster - broadcast raw data
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
  private clusters = ['BR', 'TEMP', 'HM'];

  constructor(
    private readonly handler: SimpleUniversalHandler,
  ) {}

  async onModuleInit() {
    // Create gateways for all clusters
    this.clusters.forEach((clusterCode) => {
      this.createGateway(clusterCode);
    });
  }

  /**
   * Set Socket.IO server
   */
  setServer(io: Server): void {
    this.io = io;
    
    // Initialize all gateways
    this.gateways.forEach((gateway) => {
      gateway.initialize(io);
    });
    
    this.logger.log(`✅ WebSocket server initialized with ${this.gateways.size} namespaces`);
  }

  /**
   * Create gateway for cluster
   */
  private createGateway(clusterCode: string): void {
    const namespace = `/ws/${clusterCode}`;
    const gateway = new GenericWebSocketGateway(namespace, clusterCode);
    
    // Register with handler (để handler có thể broadcast)
    this.handler.registerGateway(namespace, gateway);
    
    // Store gateway
    this.gateways.set(clusterCode, gateway);
    
    // Initialize if server exists
    if (this.io) {
      gateway.initialize(this.io);
    }

    this.logger.log(`📡 Created gateway: ${namespace}`);
  }

  /**
   * Add cluster dynamically
   */
  addCluster(clusterCode: string): void {
    if (!this.clusters.includes(clusterCode)) {
      this.clusters.push(clusterCode);
      this.createGateway(clusterCode);
      this.logger.log(`➕ Added cluster: ${clusterCode}`);
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
