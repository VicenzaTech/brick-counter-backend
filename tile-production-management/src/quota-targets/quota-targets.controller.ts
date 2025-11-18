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
    UseGuards,
} from '@nestjs/common';
import { QuotaTargetsService } from './quota-targets.service';
import {
    CreateQuotaTargetDto,
    UpdateQuotaTargetDto,
    QuotaComparisonDto,
} from './dtos/quota-target.dto';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';

@Controller('quota-targets')
@UseGuards(AuthGuard, PermissionGuard)
export class QuotaTargetsController {
    constructor(private readonly quotaService: QuotaTargetsService) { }

    @Post()
    @Permission(PERMISSIONS.QUOTA_TARGET_CREATE)
    create(@Body() createDto: CreateQuotaTargetDto) {
        return this.quotaService.create(createDto);
    }

    @Get()
    @Permission(PERMISSIONS.QUOTA_TARGET_READ)
    findAll() {
        return this.quotaService.findAll();
    }

    @Get('active')
    findActive() {
        return this.quotaService.findActive();
    }

    @Get('brick-type/:brickTypeId')
    @Permission(PERMISSIONS.BRICK_TYPE_READ)
    findByBrickType(@Param('brickTypeId', ParseIntPipe) brickTypeId: number) {
        return this.quotaService.findByBrickType(brickTypeId);
    }

    @Post('compare')
    @Permission(PERMISSIONS.QUOTA_TARGET_READ)
    compareWithQuota(@Body() comparisonDto: QuotaComparisonDto) {
        return this.quotaService.compareWithQuota(comparisonDto);
    }

    @Get(':id')
    @Permission(PERMISSIONS.QUOTA_TARGET_READ)
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.quotaService.findOne(id);
    }

    @Put(':id')
    @Permission(PERMISSIONS.QUOTA_TARGET_UPDATE)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDto: UpdateQuotaTargetDto,
    ) {
        return this.quotaService.update(id, updateDto);
    }

    @Delete(':id')
    @Permission(PERMISSIONS.QUOTA_TARGET_DELETE)
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.quotaService.remove(id);
    }
}
