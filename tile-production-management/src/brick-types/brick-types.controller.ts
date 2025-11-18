import {
    Controller,
    Get,
    Post,
    Body,
    Put,
    Param,
    Delete,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { BrickTypesService } from './brick-types.service';
import { CreateBrickTypeDto } from './dtos/create-brick-type.dto';
import { UpdateBrickTypeDto } from './dtos/update-brick-type.dto';
import type { BrickType } from './entities/brick-type.entity';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { PERMISSIONS } from 'src/users/permission.constant';

@Controller('brick-types')
@UseGuards(AuthGuard, PermissionGuard)
export class BrickTypesController {
    constructor(private readonly brickTypesService: BrickTypesService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permission(PERMISSIONS.BRICK_TYPE_CREATE)
    create(@Body() createBrickTypeDto: CreateBrickTypeDto): Promise<BrickType> {
        return this.brickTypesService.create(createBrickTypeDto);
    }

    @Get()
    @Permission(PERMISSIONS.BRICK_TYPE_READ)
    findAll(): Promise<BrickType[]> {
        return this.brickTypesService.findAll();
    }

    @Get(':id')
    @Permission(PERMISSIONS.BRICK_TYPE_READ)
    findOne(@Param('id') id: string): Promise<BrickType> {
        return this.brickTypesService.findOne(+id);
    }

    @Put(':id')
    @Permission(PERMISSIONS.BRICK_TYPE_UPDATE)
    update(
        @Param('id') id: string,
        @Body() updateBrickTypeDto: UpdateBrickTypeDto,
    ): Promise<BrickType> {
        return this.brickTypesService.update(+id, updateBrickTypeDto);
    }

    @Delete(':id')
    @Permission(PERMISSIONS.BRICK_TYPE_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string): Promise<void> {
        return this.brickTypesService.remove(+id);
    }

    @Get('active/all')
    @Permission(PERMISSIONS.BRICK_TYPE_UPDATE)
    findAllActive(): Promise<BrickType[]> {
        return this.brickTypesService.findAllActive();
    }

    @Get('active/production-line/:lineId')
    @Permission(PERMISSIONS.PRODUCTION_LINE_READ)
    findByProductionLine(@Param('lineId') lineId: string): Promise<BrickType[]> {
        return this.brickTypesService.findByProductionLine(+lineId);
    }

    @Put(':id/activate')
    @Permission(PERMISSIONS.PRODUCTION_LINE_UPDATE)
    setActive(
        @Param('id') id: string,
        @Body() body: { productionLineId: number; status?: 'producing' | 'paused' },
    ): Promise<BrickType> {
        return this.brickTypesService.setActive(+id, body.productionLineId, body.status);
    }

    @Put(':id/deactivate')
    @Permission(PERMISSIONS.PRODUCTION_LINE_UPDATE)
    setInactive(@Param('id') id: string): Promise<BrickType> {
        return this.brickTypesService.setInactive(+id);
    }
}
