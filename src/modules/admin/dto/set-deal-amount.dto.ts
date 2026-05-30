import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetDealAmountDto {
  @ApiProperty({ example: 16, description: 'The database ID of the lead' })
  @IsNotEmpty()
  @IsNumber()
  leadId: number;

  @ApiProperty({
    example: 150000,
    description: 'The total value amount of the project deal',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Deal amount must be greater than zero' })
  dealAmount: number;
}
