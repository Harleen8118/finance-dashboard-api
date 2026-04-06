import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RecordsService } from './records.service';
import { CreateRecordDto, UpdateRecordDto, FilterRecordsDto } from './dto';
import { Roles } from '../common/decorators';
import { Role } from '../common/enums';

@ApiTags('Records')
@ApiBearerAuth()
@Controller('records')
export class RecordsController {
  constructor(private recordsService: RecordsService) {}

  @Get()
  @ApiOperation({ summary: 'List financial records with filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of records' })
  findAll(@Query() filters: FilterRecordsDto) {
    return this.recordsService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a financial record by ID' })
  @ApiResponse({ status: 200, description: 'Record details' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.recordsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a financial record (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Record created' })
  create(@Body() dto: CreateRecordDto, @Request() req: any) {
    return this.recordsService.create(dto, req.user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a financial record (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Record updated' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecordDto,
  ) {
    return this.recordsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a financial record (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Record soft-deleted' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.recordsService.remove(id);
  }
}
