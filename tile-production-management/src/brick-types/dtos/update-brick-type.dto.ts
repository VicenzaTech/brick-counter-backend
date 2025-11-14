export class UpdateBrickTypeDto {
  name?: string;
  description?: string;
  unit?: string;
  specs?: any;
  isActive?: boolean;
  activeProductionLineId?: number;
  activeStatus?: 'producing' | 'paused' | 'inactive';
}
