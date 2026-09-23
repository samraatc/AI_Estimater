import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { Quotation, QuotationSchema } from './entities/quotation.entity';
import { Estimation, EstimationSchema } from '../estimations/entities/estimation.entity';
import { Project, ProjectSchema } from '../projects/entities/project.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quotation.name, schema: QuotationSchema },
      { name: Estimation.name, schema: EstimationSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    AiModule,
  ],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}

