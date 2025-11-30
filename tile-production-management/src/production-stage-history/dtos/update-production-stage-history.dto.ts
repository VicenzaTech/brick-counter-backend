
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductionStageHistoryDto } from './create-production-stage-history.dto';

export class UpdateProductionStageHistoryDto extends PartialType(CreateProductionStageHistoryDto) {}