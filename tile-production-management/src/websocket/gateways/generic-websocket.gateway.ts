/**
 * Generic WebSocket Gateway
 * Dùng cho Simple Universal để tạo namespace động cho từng cluster
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

  initialize(io: Server): void {
    this.server = io.of(this.namespace);
    if (!this.server) return;
    this.server.on('connection', (socket: Socket) => {
      // Room subscription
      socket.on('subscribe', (data: { rooms: string[] }) => {
        if (Array.isArray(data.rooms)) {
          data.rooms.forEach(room => socket.join(room));
        }
      });
    });
  }

  getConnectedClientCount(): number {
    if (!this.server) return 0;
    // For socket.io v4, sockets is a Map
    return this.server.sockets.size;
  }

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
