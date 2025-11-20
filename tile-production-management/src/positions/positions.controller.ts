import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { PositionsService } from './positions.service';
import { Position } from './entities/position.entity';
import { CreatePositionDto } from './dtos/create-position.dto';
import { UpdatePositionDto } from './dtos/update-position.dto';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';
import { UpdatePossitionIndexDto } from './dtos/update-position-index.dto';

@Controller('positions')
@UseGuards(AuthGuard, PermissionGuard)
export class PositionsController {
    constructor(private readonly positionsService: PositionsService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permission(PERMISSIONS.POSITION_CREATE)
    create(@Body() createPositionDto: CreatePositionDto): Promise<Position> {
        return this.positionsService.create(createPositionDto);
    }

    @Get()
    @Permission(PERMISSIONS.POSITION_READ)
    findAll(): Promise<Position[]> {
        return this.positionsService.findAll();
    }

    @Get(':id')
    @Permission(PERMISSIONS.POSITION_READ)
    findOne(@Param('id') id: string): Promise<Position> {
        return this.positionsService.findOne(+id);
    }

    @Patch(':id')
    @Permission(PERMISSIONS.POSITION_UPDATE)
    update(
        @Param('id') id: string,
        @Body() updatePositionDto: UpdatePositionDto,
    ): Promise<Position> {
        return this.positionsService.update(+id, updatePositionDto);
    }

    @Patch(':id')
    @Permission(PERMISSIONS.POSITION_UPDATE)
    updateIndex(
        @Param('id') id: string,
        @Body() updatePositionIndexDto: UpdatePossitionIndexDto,
    ): Promise<Position> {
        return this.positionsService.updateIndex(+id, updatePositionIndexDto);
    }

    @Delete(':id')
    @Permission(PERMISSIONS.POSITION_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string): Promise<void> {
        return this.positionsService.remove(+id);
    }
}
