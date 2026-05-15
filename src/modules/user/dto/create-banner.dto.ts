import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class BannerDto {
  @ApiProperty({
    required: false, // ⚠️ make false here (handled by validation)
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

  @ApiProperty({ example: 144 })
  @IsNumber()
  @IsNotEmpty()
  sectionId: number;

  @ApiProperty({ example: 'This is banner alt text' })
  @IsString()
  @IsOptional()
  altText?: string;

  @ApiProperty({ example: 'This is banner title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'This is banner sub title' })
  @IsString()
  @IsOptional()
  subTitle?: string;

  @ApiProperty({ example: 'This is banner description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'This is banner button' })
  @IsString()
  @IsOptional()
  button?: string;
}
