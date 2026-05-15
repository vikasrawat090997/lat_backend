import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class TheoryOfChangeDto {
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

  @ApiProperty({ example: 147 })
  @IsNumber()
  @IsNotEmpty()
  sectionId: number;

  @ApiProperty({ example: 'Theory of Change title' })
  @IsString()
  // @IsOptional()
  title?: string;

  @ApiProperty({ example: 'Theory of Change description' })
  @IsString()
  // @IsOptional()
  description?: string;

  @ApiProperty({ example: 'Theory of Change alt text' })
  @IsString()
  @IsOptional()
  altText?: string;
}
