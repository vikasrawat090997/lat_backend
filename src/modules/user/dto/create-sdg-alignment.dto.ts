import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class SDGAlignmentDto {
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

  @ApiProperty({ example: 146 })
  @IsNumber()
  @IsNotEmpty()
  sectionId: number;

  @ApiProperty({ example: 'SDG title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'SDG description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'SDG alt text' })
  @IsString()
  @IsOptional()
  altText?: string;
}
