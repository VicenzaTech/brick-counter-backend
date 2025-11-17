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
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto } from './dtos/create-workshop.dto';
import { UpdateWorkshopDto } from './dtos/update-workshop.dto'; import type { Workshop } from './entities/workshop.entity';
import { AuthGuard } from 'src/auth/guard/auth/auth.guard';
import { PermissionGuard } from 'src/auth/guard/permission/permission.guard';
import { Permission } from 'src/auth/decorator/permission/permission.decorator';
import { PERMISSIONS } from 'src/users/permission.constant';

@Controller('workshops')
@UseGuards(AuthGuard, PermissionGuard)
export class WorkshopsController {
    constructor(private readonly workshopsService: WorkshopsService) { }

    @Post()
    @Permission(PERMISSIONS.WORKSHOP_CREATE)
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createWorkshopDto: CreateWorkshopDto): Promise<Workshop> {
        return this.workshopsService.create(createWorkshopDto);
    }

    @Get()
    @Permission(PERMISSIONS.WORKSHOP_READ)
    findAll(): Promise<Workshop[]> {
        return this.workshopsService.findAll();
    }

    @Get(':id')
    @Permission(PERMISSIONS.WORKSHOP_READ)
    findOne(@Param('id') id: string): Promise<Workshop> {
        return this.workshopsService.findOne(+id);
    }

    @Put(':id')
    @Permission(PERMISSIONS.WORKSHOP_UPDATE)
    update(
        @Param('id') id: number,
        @Body() updateWorkshopDto: UpdateWorkshopDto,
    ): Promise<Workshop> {
        return this.workshopsService.update(+id, updateWorkshopDto);
    }

    @Delete(':id')
    @Permission(PERMISSIONS.WORKSHOP_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string): Promise<void> {
        return this.workshopsService.remove(+id);
    }
}
