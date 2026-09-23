import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Estimation, EstimationSchema } from '../estimations/entities/estimation.entity';
import { Project, ProjectSchema } from '../projects/entities/project.entity';
import { Quotation, QuotationSchema } from '../quotations/entities/quotation.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Estimation.name, schema: EstimationSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Quotation.name, schema: QuotationSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

