import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectLeadDto {
  @ApiProperty({
    description: 'The unique identification database ID of the lead record',
    example: 16,
  })
  @IsNotEmpty()
  leadId: number;

  @ApiProperty({
    description:
      'Mandatory text feedback explaining why this lead is being disqualified',
    example: 'svdfhjt',
  })
  @IsString()
  @IsNotEmpty()
  remarks: string;

  // We explicitly change the Swagger representation of this field to binary format
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Optional audio recording attachment (MP3, WAV, M4A)',
    required: false,
  })
  voiceRecording?: any; // Change type to any so the validator doesn't reject the file object
}
