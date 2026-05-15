import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CreatePageDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsNumber()
  isHeader?: number;

  @IsOptional()
  @IsNumber()
  isFooter?: number;

  @IsOptional()
  @IsNumber()
  headerPriority?: number;

  @IsOptional()
  @IsNumber()
  footerPriority?: number;

  @IsOptional()
  @IsNumber()
  parentId?: number;

  @IsOptional()
  @IsNumber()
  createdBy?: number;
}
