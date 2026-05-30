import { IsOptional, IsString, IsEnum } from 'class-validator';
import { LeadStatus } from 'src/utils/enums';

export class GetLeadsQueryDto {
  // Matches the text box "Search name, phone, ID..."
  @IsOptional()
  @IsString()
  search?: string;

  // Matches the "All Statuses" dropdown filter panel
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;
}
