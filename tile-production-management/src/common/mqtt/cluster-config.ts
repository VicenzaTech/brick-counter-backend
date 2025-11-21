export type MqttQos = 0 | 1 | 2;

export interface ClusterCommandTopic {
    code: string;            //  reset, reset_counter, pause_line...
    name?: string;
    topic: string;           // topic template: "/devices/{deviceId}/command"
    payloadTemplate?: any;   // JSON template cho payload
}

export interface ClusterTelemetryTopic {
    topic: string;           // "/devices/{deviceId}/telemetry"
    qos?: MqttQos;
}

export interface ClusterConfig {
    qosDefault?: MqttQos;
    interval_message_time?: number;
    telemetry?: ClusterTelemetryTopic;
    commands?: ClusterCommandTopic[];
    other?: object;
}
