export type MqttQos = 0 | 1 | 2;

export interface DeviceCommandTopic {
    type: 'reset' | 'reset_counter' | 'calibrate' | 'custom';
    topic: string;         
    payloadTemplate?: any;  
}

export interface DeviceTelemetryTopic {
    topic: string;          
    qos?: MqttQos;
}

export interface DeviceExtraInfo {
    interval_message_time?: number;
    telemetry?: DeviceTelemetryTopic;
    commands?: DeviceCommandTopic[];
    other?: object;
}
