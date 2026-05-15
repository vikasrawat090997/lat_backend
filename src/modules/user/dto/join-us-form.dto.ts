import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateJoinUsFormDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: 25 })
  @IsNumber()
  @IsNotEmpty()
  pageId: number;

  @ApiProperty({ example: 149 })
  @IsNumber()
  @IsNotEmpty()
  sectionId: number;

  @ApiProperty({ example: 'Join Us title' })
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Join Us description' })
  @IsString()
  description?: string;
}
