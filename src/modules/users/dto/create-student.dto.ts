import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStudentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  firstName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  lastName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  parentMobile: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rollNo?: string;

  @ApiProperty()
  @IsNotEmpty()
  gradeId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  section?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  udisecode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fatherName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  motherName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dob?: string; // Expects format like DDMMYYYY or DD-MM-YYYY

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}
