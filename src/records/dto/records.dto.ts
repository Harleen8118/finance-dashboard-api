import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

enum RecordType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export class CreateRecordDto {
  @ApiProperty({ example: 5000.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({ enum: RecordType, example: 'INCOME' })
  @IsEnum(RecordType)
  type!: RecordType;

  @ApiProperty({ example: 'Salary' })
  @IsString()
  category!: string;

  @ApiProperty({ example: '2026-01-15T00:00:00.000Z' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: 'Monthly salary payment' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRecordDto {
  @ApiPropertyOptional({ example: 5000.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({ enum: RecordType })
  @IsOptional()
  @IsEnum(RecordType)
  type?: RecordType;

  @ApiPropertyOptional({ example: 'Salary' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '2026-01-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class FilterRecordsDto {
  @ApiPropertyOptional({ enum: RecordType })
  @IsOptional()
  @IsEnum(RecordType)
  type?: RecordType;

  @ApiPropertyOptional({ example: 'Salary' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
