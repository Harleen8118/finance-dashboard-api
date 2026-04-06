import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ enum: Role, default: Role.VIEWER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@finance.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin1234!' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
