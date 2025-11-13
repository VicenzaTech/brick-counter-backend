export class CreateProductionLineDto {
  name: string;
  description?: string;
  capacity?: number;
  status?: string;
  workshopId: number;
}
