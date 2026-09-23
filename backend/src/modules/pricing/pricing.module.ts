import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { PricingItem, PricingItemSchema } from './entities/pricing-item.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PricingItem.name, schema: PricingItemSchema },
    ]),
  ],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}

