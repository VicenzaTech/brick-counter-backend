export class CreateDeviceDto {
    name: string;
    type?: string;
    serial_number: string;
    installation_date?: string;
    status?: string;
    last_maintenance?: string;
    positionId: number;
    interval_message_time?: number;
    qosDefault?: 0 | 1 | 2;
    device_id: string;
}
