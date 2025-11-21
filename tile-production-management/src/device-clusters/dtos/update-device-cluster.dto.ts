import { ClusterConfig } from "src/common/mqtt/cluster-config";

export class UpdateDeviceClusterDto {
    name?: string;
    code?: string;
    description?: string;
    config?: ClusterConfig;
    measurementTypeId?: number;
    productionLineId?: number | null;
}
