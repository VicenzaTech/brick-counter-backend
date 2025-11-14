import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { QuotaTargetsService } from './quota-targets.service';
import {
  CreateQuotaTargetDto,
  UpdateQuotaTargetDto,
  QuotaComparisonDto,
} from './dtos/quota-target.dto';

@Controller('quota-targets')
export class QuotaTargetsController {
  constructor(private readonly quotaService: QuotaTargetsService) {}

  @Post()
  create(@Body() createDto: CreateQuotaTargetDto) {
    return this.quotaService.create(createDto);
  }

  @Get()
  findAll() {
    return this.quotaService.findAll();
  }

  @Get('active')
  findActive() {
    return this.quotaService.findActive();
  }

  @Get('brick-type/:brickTypeId')
  findByBrickType(@Param('brickTypeId', ParseIntPipe) brickTypeId: number) {
    return this.quotaService.findByBrickType(brickTypeId);
  }

  @Post('compare')
  compareWithQuota(@Body() comparisonDto: QuotaComparisonDto) {
    return this.quotaService.compareWithQuota(comparisonDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quotaService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateQuotaTargetDto,
  ) {
    return this.quotaService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.quotaService.remove(id);
  }
}
