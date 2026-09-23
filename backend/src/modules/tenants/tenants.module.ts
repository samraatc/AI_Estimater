import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { Tenant, TenantSchema } from './entities/tenant.entity';
import { Role, RoleSchema } from '../users/entities/role.entity';
import { User, UserSchema } from '../users/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}

