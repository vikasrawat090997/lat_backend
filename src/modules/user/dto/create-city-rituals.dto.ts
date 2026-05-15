import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CityRitualsDto {
  @ApiProperty({
    required: false,
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  image?: any;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: 25 })
  @IsNumber()
  @IsNotEmpty()
  pageId: number;

  @ApiProperty({ example: 148 })
  @IsNumber()
  @IsNotEmpty()
  sectionId: number;

  @ApiProperty({ example: 'City Rituals title' })
  @IsString()
  title?: string;

  @ApiProperty({ example: 'City Rituals venue' })
  @IsString()
  venue?: string;

  @ApiProperty({ example: 'City Rituals date' })
  @IsString()
  date?: string;

  @ApiProperty({ example: 'City Rituals time' })
  @IsString()
  time?: string;

  @ApiProperty({ example: 'City Rituals description' })
  @IsString()
  description?: string;

  @ApiProperty({ example: 'City Rituals alt text' })
  @IsString()
  @IsOptional()
  altText?: string;
}
