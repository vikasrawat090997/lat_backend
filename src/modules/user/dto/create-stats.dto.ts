import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateStatsDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 25 })
  @IsNumber()
  @IsNotEmpty()
  pageId: number;

  @ApiProperty({ example: 144 })
  @IsNumber()
  @IsNotEmpty()
  sectionId: number;
}
