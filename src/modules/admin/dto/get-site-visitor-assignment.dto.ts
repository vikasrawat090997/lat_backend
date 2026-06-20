import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentTabFilter } from 'src/utils/enums';

export class GetAssignmentsQueryDto {
  @ApiPropertyOptional({
    description:
      'Filter rows via name, unique custom code ID, or mobile number context',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: AssignmentTabFilter,
    default: AssignmentTabFilter.ALL,
  })
  @IsOptional()
  @IsEnum(AssignmentTabFilter)
  tab?: AssignmentTabFilter = AssignmentTabFilter.ALL;
}
