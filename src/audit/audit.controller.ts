import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { FilterAuditLogsDto } from './dto';
import { Roles } from '../common/decorators';
import { Role } from '../common/enums';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List audit logs (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of audit logs' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  findAll(@Query() filters: FilterAuditLogsDto) {
    return this.auditService.findAll(filters);
  }
}
