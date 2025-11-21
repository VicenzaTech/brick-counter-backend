import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateDeviceDto {
    @IsString()
    @IsNotEmpty({ message: 'Không được bỏ trống tên thiết bị' })
    name: string;

    @IsString()
    type?: string;
    @IsString()
    @IsNotEmpty({ message: 'Không được bỏ trống số serial' })
    serial_number: string;

    @IsString()
    @IsNotEmpty({ message: 'Không được bỏ trống số serial' })
    installation_date?: string;

    @IsString()
    @IsNotEmpty({ message: 'Không được bỏ trống vị trí' })
    positionId: number;

    @IsString()
    interval_message_time?: number = 60;
    qosDefault?: 0 | 1 | 2;
    telemetryTopic?: string;
    commands?: {
        type: 'reset' | 'reset_counter' | 'calibrate' | 'custom';
        topic: string;
        payloadTemplate?: any;
    }[];
    other?: object;
    deviceId?: string;
    device_id?: string; // backward compatibility

    @IsNumber()
    @IsNotEmpty({ message: 'Phải chọn cụm thiết bị' })
    clusterId?: number;
}
