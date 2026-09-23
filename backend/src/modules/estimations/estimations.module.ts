import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EstimationsService } from './estimations.service';
import { EstimationsController } from './estimations.controller';
import { Estimation, EstimationSchema } from './entities/estimation.entity';
import { EstimationItem, EstimationItemSchema } from './entities/estimation-item.entity';
import { AuditLog, AuditLogSchema } from '../../common/entities/audit-log.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Estimation.name, schema: EstimationSchema },
      { name: EstimationItem.name, schema: EstimationItemSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    AiModule,
  ],
  controllers: [EstimationsController],
  providers: [EstimationsService],
  exports: [EstimationsService],
})
export class EstimationsModule {}

