import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class UpdateSectionDto {
  @IsNumber()
  @IsNotEmpty()
  pageId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  priority?: string;
}
