import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateSectionDto {
  @IsNumber()
  @IsNotEmpty()
  pageId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  priority: string;
}
