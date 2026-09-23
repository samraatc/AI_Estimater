import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { User, UserSchema } from '../users/entities/user.entity';
import { RefreshToken, RefreshTokenSchema } from './entities/refresh-token.entity';
import { Tenant, TenantSchema } from '../tenants/entities/tenant.entity';
import { Role, RoleSchema } from '../users/entities/role.entity';
import { AuditLog, AuditLogSchema } from '../../common/entities/audit-log.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Role.name, schema: RoleSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({ imports: [ConfigModule], inject: [ConfigService], useFactory: (cfg: ConfigService) => ({ secret: cfg.get('app.jwtSecret'), signOptions: { expiresIn: cfg.get('app.jwtExpiry', '15m') } }) }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

