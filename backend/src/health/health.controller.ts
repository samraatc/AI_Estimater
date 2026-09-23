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
    // If connection is in progress (connecting: state 2), wait briefly
    if (this.connection.readyState === 2) {
      try {
        await Promise.race([
          this.connection.asPromise(),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch {
        // ignore timeout
      }
    }

    const state = this.connection.readyState;
    const isConnected = state === 1;
    const dbStatus = state === 1 ? 'connected' : state === 2 ? 'connecting' : 'disconnected';

    return {
      status: isConnected ? 'ok' : 'degraded',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
