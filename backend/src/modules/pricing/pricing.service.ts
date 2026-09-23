import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PricingItem, PricingItemDocument } from './entities/pricing-item.entity';

@Injectable()
export class PricingService {
  constructor(@InjectModel(PricingItem.name) private itemModel: Model<PricingItemDocument>) {}

  async findAll(tenantId: string, q: any = {}) {
    const { search, category, currency } = q;
    const filter: any = { tenantId, isActive: true };
    if (category) filter.category = category;
    if (currency) filter.currency = currency;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { code: regex }];
    }
    return this.itemModel.find(filter).sort({ category: 1, name: 1 }).lean();
  }

  async findOne(id: string, tenantId: string) {
    const i = await this.itemModel.findOne({ id, tenantId }).lean();
    if (!i) throw new NotFoundException('Pricing item not found');
    return i;
  }

  async create(dto: any, tenantId: string, userId: string) {
    const created = await this.itemModel.create({ ...dto, tenantId, createdBy: userId, source: 'manual' });
    return created.toObject();
  }

  async update(id: string, dto: any, tenantId: string) {
    await this.itemModel.updateOne({ id, tenantId }, { $set: dto });
    return this.findOne(id, tenantId);
  }

  async delete(id: string, tenantId: string) {
    await this.itemModel.updateOne({ id, tenantId }, { $set: { isActive: false } });
  }

  async bulkImport(items: any[], tenantId: string, userId: string) {
    const documents = items.map(i => ({ ...i, tenantId, createdBy: userId, source: 'imported' }));
    return this.itemModel.insertMany(documents);
  }

  async getCategories(tenantId: string): Promise<string[]> {
    return this.itemModel.distinct('category', { tenantId });
  }
}

