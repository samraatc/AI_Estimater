import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { User, UserSchema } from '../users/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

