import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Project, ProjectSchema } from '../projects/entities/project.entity';
import { Estimation, EstimationSchema } from '../estimations/entities/estimation.entity';
import { Client, ClientSchema } from '../clients/entities/client.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Estimation.name, schema: EstimationSchema },
      { name: Client.name, schema: ClientSchema },
    ]),
  ],
  providers: [SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
