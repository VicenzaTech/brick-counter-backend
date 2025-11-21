/**
 * Cluster Handler Interface
 * Interface chung cho tất cả cluster handlers
 * Mỗi cluster (BR, TEMP, HM, ...) sẽ có handler riêng implement interface này
 */

export interface ClusterHandler {
  /**
   * Mã cluster (BR, TEMP, HM, ...)
   */
  readonly clusterCode: string;

  /**
   * Xử lý telemetry message từ device
   */
  handleTelemetry(deviceId: string, message: any): Promise<void>;

  /**
   * Xử lý status message từ device
   */
  handleStatus(deviceId: string, message: any): Promise<void>;

  /**
   * Validate payload trước khi xử lý
   */
  validatePayload(message: any): boolean;

  /**
   * Publish command tới device cụ thể
   */
  publishCommand(deviceId: string, command: any): Promise<void>;

  /**
   * Broadcast command tới tất cả devices trong cluster
   */
  broadcastCommand(command: any): Promise<void>;
}
