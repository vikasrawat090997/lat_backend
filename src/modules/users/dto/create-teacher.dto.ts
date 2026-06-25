import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTeacherDto {
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
  mobileNo: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  empCode: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  udisecode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address: string;

  @ApiPropertyOptional()
  @IsNotEmpty()
  @IsString()
  gradeId: string;

  @ApiPropertyOptional()
  @IsNotEmpty()
  @IsString()
  subjectId: string;
}
