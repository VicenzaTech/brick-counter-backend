import { PartialType } from '@nestjs/mapped-types';
import { CreateProductionLineRunDto } from './create-production-line-run.dto';

export class UpdateProductionLineRunDto extends PartialType(CreateProductionLineRunDto) {}
