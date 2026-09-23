import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project, ProjectSchema } from './entities/project.entity';
import { Client, ClientSchema } from '../clients/entities/client.entity';
import { AuditLog, AuditLogSchema } from '../../common/entities/audit-log.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Client.name, schema: ClientSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}

