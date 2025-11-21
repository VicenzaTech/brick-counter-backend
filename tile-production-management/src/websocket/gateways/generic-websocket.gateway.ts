/**
 * Generic WebSocket Gateway
 * Dùng cho Simple Universal để tạo namespace động cho từng cluster
 * 
 * Mỗi cluster có 1 namespace riêng:
 * - /ws/BR → Brick Counter
 * - /ws/TEMP → Temperature
 * - /ws/HM → Humidity
 * - etc.
 */

import { Server, Socket, Namespace } from 'socket.io';

export class GenericWebSocketGateway {
  private namespace: string;
  private clusterCode: string;
  public server: Namespace | undefined;

  constructor(namespace: string, clusterCode: string) {
    this.namespace = namespace;
    this.clusterCode = clusterCode;
  }

  /**
   * Initialize namespace with Socket.IO server
   */
  initialize(io: Server): void {
    this.server = io.of(this.namespace);
    if (!this.server) return;
    
    this.server.on('connection', (socket: Socket) => {
      // Room subscription - client can subscribe to specific rooms
      socket.on('subscribe', (data: { rooms: string[] }) => {
        if (Array.isArray(data.rooms)) {
          data.rooms.forEach(room => socket.join(room));
        }
      });
    });
  }

  /**
   * Broadcast telemetry data to specified rooms
   * Used by SimpleUniversalHandler.broadcastRawData()
   */
  broadcastTelemetry(rooms: string[], payload: any): void {
    if (!this.server) return;
    
    // Broadcast to all specified rooms
    rooms.forEach(room => {
      this.server!.to(room).emit('telemetry', payload);
    });
  }

  /**
   * Broadcast status data to specified rooms
   * Used by SimpleUniversalHandler.handleStatus()
   */
  broadcastStatus(rooms: string[], payload: any): void {
    if (!this.server) return;
    
    // Broadcast to all specified rooms
    rooms.forEach(room => {
      this.server!.to(room).emit('status', payload);
    });
  }

  /**
   * Get number of connected clients in this namespace
   */
  getConnectedClientCount(): number {
    if (!this.server) return 0;
    // For socket.io v4, sockets is a Map
    return this.server.sockets.size;
  }

  /**
   * Get room statistics for this namespace
   */
  getRoomStats(): Map<string, number> {
    const stats = new Map<string, number>();
    if (!this.server) return stats;
    // For socket.io v4, rooms is a Map<string, Set<SocketId>>
    const rooms = this.server.adapter.rooms as Map<string, Set<string>>;
    for (const [room, sockets] of rooms) {
      stats.set(room, sockets.size);
    }
    return stats;
  }
}
