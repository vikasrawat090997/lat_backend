import { PartialType } from '@nestjs/mapped-types';
import { CreatePageDto } from './create-page.dto';
import { IsOptional } from 'class-validator';

export class UpdatePageDto extends PartialType(CreatePageDto) {
  @IsOptional()
  updatedBy?: number;
}
