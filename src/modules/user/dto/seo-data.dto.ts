// seo.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class SeoDto {
  @IsNumber()
  @IsNotEmpty()
  pageId: number;

  @IsString()
  // @IsNotEmpty()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsArray()
  @ArrayMaxSize(15, {
    message: 'Maximum 15 keywords allowed',
  })
  keywords: string[];
}
