import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignInstallerDto {
  @ApiProperty({ example: 16, description: 'The database ID of the lead' })
  @IsNotEmpty()
  @IsNumber()
  leadId: number;

  @ApiProperty({
    example: 12,
    description: 'The database ID of the selected installer/technician user',
  })
  @IsNotEmpty()
  @IsNumber()
  installerUserId: number;

  @ApiProperty({
    example: 'Standard solar panel set deployment setup required.',
    description: 'Optional technician notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
