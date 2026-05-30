import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddPaymentDto {
  @ApiProperty({ example: 16 })
  @IsNotEmpty()
  @IsNumber()
  leadId: number;

  @ApiProperty({ example: 50000, description: 'The payment amount collected' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Collected amount must be greater than zero' })
  amount: number;

  @ApiProperty({
    example: 'UPI - Txn Ref ID: 612849124',
    description: 'Payment mode or reference notes',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  paymentModeNote: string;
}
