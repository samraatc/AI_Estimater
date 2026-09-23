import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './entities/user.entity';
import { Role, RoleSchema } from './entities/role.entity';
import { Tenant, TenantSchema } from '../tenants/entities/tenant.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

