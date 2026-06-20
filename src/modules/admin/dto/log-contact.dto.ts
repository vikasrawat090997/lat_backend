import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CallStatusSelection {
  CONNECTED = 'Connected',
  NOT_CONNECTED = 'Not Connected',
  WRONG_NUMBER = 'Wrong Number',
  NOT_INTERESTED = 'Not Interested',
}

export class LogContactDto {
  @ApiProperty({ example: 16, description: 'The database ID of the lead' })
  @IsNotEmpty()
  @IsNumber()
  leadId: number;

  @ApiProperty({
    enum: CallStatusSelection,
    example: CallStatusSelection.CONNECTED,
  })
  @IsNotEmpty()
  @IsEnum(CallStatusSelection)
  callStatus: CallStatusSelection;

  @ApiProperty({
    example: 'Customer picked up and asked to visit tomorrow morning.',
    description: 'Call interaction logs notes',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  callRemarks: string;
}
