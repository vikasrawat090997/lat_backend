import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDateString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScheduleVisitDto {
  @ApiProperty({ example: 17, description: 'The database ID of the lead' })
  @IsNotEmpty()
  @IsNumber()
  leadId: number;

  @ApiProperty({
    example: '2026-06-25',
    description: 'The scheduled calendar date for the survey',
  })
  @IsNotEmpty()
  @IsDateString()
  visitDate: string;

  @ApiProperty({
    example: '10:00 AM – 12:00 PM',
    description: 'The selected time frame window row string',
  })
  @IsNotEmpty()
  @IsString()
  timeSlot: string;

  @ApiProperty({
    example: 'Client requested phone confirmation 30 mins prior.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
