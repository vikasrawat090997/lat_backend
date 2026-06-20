import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteVisitDto {
  @ApiProperty({
    example: 'Flat roof in excellent condition. 6kW system feasible.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  assessmentNotes: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Array of roof photos (1-4 files)',
  })
  roofPhotos: any;
}
