export class CreateDeviceDto {
  name: string;
  type?: string;
  serial_number: string;
  installation_date?: string;
  status?: string;
  last_maintenance?: string;
  positionId: number;
}
