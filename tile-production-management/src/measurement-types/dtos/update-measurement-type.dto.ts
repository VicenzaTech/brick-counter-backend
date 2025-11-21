export class UpdateMeasurementTypeDto {
  code?: string;
  name?: string;
  unit?: string;
  description?: string;
  data_schema?: Record<string, any>;
  data_schema_version?: number;
}

