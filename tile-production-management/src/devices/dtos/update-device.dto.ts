export class UpdateDeviceDto {
    name?: string;
    type?: string;
    serial_number?: string;
    installation_date?: string;
    positionId?: number;
    interval_message_time?: number;
    qosDefault?: 0 | 1 | 2;
    telemetryTopic?: string;
    commands?: {
        type: 'reset' | 'reset_counter' | 'calibrate' | 'custom';
        topic: string;
        payloadTemplate?: any;
    }[];
    other?: object;
    deviceId?: string;
    device_id?: string; 
    clusterId?: number | null;
}
