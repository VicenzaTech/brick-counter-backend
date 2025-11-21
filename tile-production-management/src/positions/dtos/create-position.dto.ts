export class CreatePositionDto {
  name: string;
  description?: string;
  coordinates?: string;
  productionLineId: number;
  index?: number
}
