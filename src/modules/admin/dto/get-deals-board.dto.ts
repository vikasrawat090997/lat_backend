import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DealsTabFilter {
  ALL = 'all',
  IN_PROGRESS = 'in_progress',
  FULLY_PAID = 'fully_paid',
  NO_DEAL = 'no_deal',
}

export class GetDealsBoardDto {
  @ApiPropertyOptional({
    description: 'Search text box input (Customer Name, ID string, or Phone)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: DealsTabFilter,
    default: DealsTabFilter.ALL,
    description: 'Top horizontal status tab selection',
  })
  @IsOptional()
  @IsEnum(DealsTabFilter)
  tab?: DealsTabFilter = DealsTabFilter.ALL;
}
