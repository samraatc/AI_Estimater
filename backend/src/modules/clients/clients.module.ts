import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { Client, ClientSchema } from './entities/client.entity';
import { AuditLog, AuditLogSchema } from '../../common/entities/audit-log.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}

