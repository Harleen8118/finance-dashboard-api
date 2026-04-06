import { Controller, Get, Sse, MessageEvent } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Observable, fromEvent, switchMap, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators';
import { Role } from '../common/enums';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get financial summary (all authenticated users)' })
  @ApiResponse({ status: 200, description: 'Financial summary with totals and net balance' })
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Get totals grouped by category and type (all authenticated users)' })
  @ApiResponse({ status: 200, description: 'Category breakdown' })
  getByCategory() {
    return this.dashboardService.getByCategory();
  }

  @Get('trends')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: 'Get monthly trends for last 12 months (ANALYST, ADMIN)' })
  @ApiResponse({ status: 200, description: 'Monthly income and expenses trends' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ANALYST or ADMIN role' })
  getTrends() {
    return this.dashboardService.getTrends();
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get 10 most recent records (all authenticated users)' })
  @ApiResponse({ status: 200, description: 'List of 10 most recent records' })
  getRecent() {
    return this.dashboardService.getRecent();
  }

  @Sse('stream')
  @ApiOperation({ summary: 'SSE stream of dashboard updates (all authenticated users)' })
  @ApiResponse({ status: 200, description: 'Server-sent events stream' })
  stream(): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, 'records.changed').pipe(
      switchMap(() => from(this.dashboardService.getSummary())),
      map((summary) => ({ data: summary }) as MessageEvent),
    );
  }
}
