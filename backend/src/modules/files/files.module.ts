import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { ProjectFile, ProjectFileSchema } from './entities/project-file.entity';
import { Project, ProjectSchema } from '../projects/entities/project.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProjectFile.name, schema: ProjectFileSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    BullModule.registerQueue({ name: 'ai-document-processing' }),
    AiModule,
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}

