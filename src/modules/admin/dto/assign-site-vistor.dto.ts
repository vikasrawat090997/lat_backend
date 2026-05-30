import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSiteVisitorDto {
  @ApiProperty({ example: 16, description: 'The database ID of the lead' })
  @IsNotEmpty()
  @IsNumber()
  leadId: number;

  @ApiProperty({
    example: 5,
    description: 'The database ID of the selected site visitor user',
  })
  @IsNotEmpty()
  @IsNumber()
  siteVisitorUserId: number;

  @ApiProperty({
    example: 'Check roof condition carefully',
    description: 'Optional execution notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
