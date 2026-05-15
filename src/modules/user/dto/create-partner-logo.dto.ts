import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PartnerLogoItemDto {
  @ApiPropertyOptional({
    description: 'Required only for update',
    example: 1,
  })
  @IsOptional()
  id?: number;

  @ApiProperty({
    description: 'Alt text for partner logo',
    example: 'UN Women',
  })
  @IsString()
  @IsOptional()
  altText: string;
}

export class PartnerLogoDto {
  @ApiProperty({
    type: [PartnerLogoItemDto],
    description: 'Array of partner logos metadata',
    example: [
      { altText: 'Partner 1' },
      { altText: 'Partner 2' },
      { altText: 'Partner 3' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartnerLogoItemDto)
  logos: PartnerLogoItemDto[];

  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Upload multiple partner logo images',
  })
  images?: any[];
}
