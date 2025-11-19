import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrickType } from './entities/brick-type.entity';
import { ProductionLine } from '../production-lines/entities/production-line.entity';
import { CreateBrickTypeDto } from './dtos/create-brick-type.dto';
import { UpdateBrickTypeDto } from './dtos/update-brick-type.dto';

@Injectable()
export class BrickTypesService {
  constructor(
    @InjectRepository(BrickType)
    private brickTypeRepository: Repository<BrickType>,
    @InjectRepository(ProductionLine)
    private productionLineRepository: Repository<ProductionLine>,
  ) {}

  async create(createBrickTypeDto: CreateBrickTypeDto): Promise<BrickType> {
    const brickType = this.brickTypeRepository.create(createBrickTypeDto);
    return await this.brickTypeRepository.save(brickType);
  }

  async findAll(): Promise<BrickType[]> {
    return await this.brickTypeRepository.find();
  }

  async findOne(id: number): Promise<BrickType> {
    const brickType = await this.brickTypeRepository.findOne({
      where: { id },
    });

    if (!brickType) {
      throw new NotFoundException(`Brick type with ID ${id} not found`);
    }

    return brickType;
  }

  async update(
    id: number,
    updateBrickTypeDto: UpdateBrickTypeDto,
  ): Promise<BrickType> {
    const brickType = await this.findOne(id);
    Object.assign(brickType, updateBrickTypeDto);
    return await this.brickTypeRepository.save(brickType);
  }

  async remove(id: number): Promise<void> {
    const brickType = await this.findOne(id);
    await this.brickTypeRepository.remove(brickType);
  }

  /**
   * Set brick type as active on a production line
   * Note: A brick type can be active on multiple production lines simultaneously
   * Each production line can only run one brick type at a time
   */
  async setActive(
    id: number,
    productionLineId: number,
    status: 'producing' | 'paused' = 'producing',
  ): Promise<BrickType> {
    const brickType = await this.findOne(id);
    
    // Find the production line
    const productionLine = await this.productionLineRepository.findOne({
      where: { id: productionLineId },
    });

    if (!productionLine) {
      throw new NotFoundException(`Production line with ID ${productionLineId} not found`);
    }

    // Check if the production line is already running a DIFFERENT brick type
    // Phải dừng sản xuất (activeBrickTypeId = null) trước khi chọn brick type khác
    if (
      productionLine.activeBrickTypeId &&
      productionLine.activeBrickTypeId !== id
    ) {
      const existingBrick = await this.brickTypeRepository.findOne({
        where: { id: productionLine.activeBrickTypeId },
      });
      
      const statusText = productionLine.productionStatus === 'producing' ? 'đang sản xuất' : 'đang tạm dừng';
      
      throw new ConflictException(
        `Dây chuyền này ${statusText} dòng gạch "${existingBrick?.name || productionLine.activeBrickTypeId}". ` +
        `Vui lòng dừng sản xuất dòng gạch hiện tại trước khi chọn dòng khác.`
      );
    }

    // Update the production line with the new brick type
    productionLine.activeBrickTypeId = id;
    productionLine.productionStatus = status;
    await this.productionLineRepository.save(productionLine);

    // Also update the brick type for backward compatibility
    brickType.isActive = true;
    brickType.activeProductionLineId = productionLineId;
    brickType.activeStatus = status;
    brickType.lastActiveAt = new Date();
    return await this.brickTypeRepository.save(brickType);
  }

  /**
   * Set brick type as inactive on a specific production line
   * If productionLineId is provided, only stop that line
   * Otherwise, stop all lines running this brick type
   */
  async setInactive(id: number, productionLineId?: number): Promise<BrickType> {
    const brickType = await this.findOne(id);

    if (productionLineId) {
      // Stop specific production line
      const productionLine = await this.productionLineRepository.findOne({
        where: { id: productionLineId },
      });

      console.log(`🛑 Deactivating brick type ${id} on line ${productionLineId}`);
      console.log(`   Line found: ${!!productionLine}`);
      console.log(`   Current activeBrickTypeId: ${productionLine?.activeBrickTypeId}`);

      if (productionLine && productionLine.activeBrickTypeId === id) {
        productionLine.activeBrickTypeId = null as any; // Set null để dừng sản xuất (TypeORM sẽ lưu NULL vào DB)
        productionLine.productionStatus = 'stopped';
        
        const saved = await this.productionLineRepository.save(productionLine);
        console.log(`   ✅ Saved - activeBrickTypeId now: ${saved.activeBrickTypeId}`);
      } else if (productionLine) {
        console.log(`   ⚠️ Skip - Line is running different brick type: ${productionLine.activeBrickTypeId}`);
      }
    } else {
      // Stop all production lines running this brick type
      const lines = await this.productionLineRepository.find({
        where: { activeBrickTypeId: id },
      });

      for (const line of lines) {
        line.activeBrickTypeId = null as any; // Set null để dừng sản xuất (TypeORM sẽ lưu NULL vào DB)
        line.productionStatus = 'stopped';
        await this.productionLineRepository.save(line);
      }
    }

    // Update brick type status
    brickType.isActive = false;
    brickType.activeStatus = 'inactive';
    return await this.brickTypeRepository.save(brickType);
  }

  /**
   * Get all active brick types
   */
  async findAllActive(): Promise<BrickType[]> {
    return await this.brickTypeRepository.find({
      where: { isActive: true },
    });
  }

  /**
   * Get active brick types by production line
   */
  async findByProductionLine(productionLineId: number): Promise<BrickType[]> {
    return await this.brickTypeRepository.find({
      where: {
        isActive: true,
        activeProductionLineId: productionLineId,
      },
    });
  }
}
