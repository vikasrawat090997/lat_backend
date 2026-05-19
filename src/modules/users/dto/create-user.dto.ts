import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsString,
  IsNumberString,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsNumberString()
  userTypeId: string;

  @IsNotEmpty()
  @IsNumberString()
  roleId: string;

  @IsOptional()
  @IsNumberString()
  subjectId?: string;

  @IsOptional()
  @IsNumberString()
  regionId?: string;

  @IsOptional()
  @IsNumberString()
  udiseCode?: string;

  @IsOptional()
  @IsString()
  school?: string;

  @IsOptional()
  @IsNumberString()
  schoolId?: string;

  @IsOptional()
  @IsNumberString()
  projectId: string;
}

export class ForgotPasswordDto {
  @IsNotEmpty()
  email: string;
}

// dto/reset-password.dto.ts
export class ResetPasswordDto {
  token: string;
  newPassword: string;
}
