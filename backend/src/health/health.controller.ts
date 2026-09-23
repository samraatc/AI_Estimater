import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../modules/auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const isConnected = this.connection.readyState === 1;
    return {
      status: isConnected ? 'ok' : 'degraded',
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
