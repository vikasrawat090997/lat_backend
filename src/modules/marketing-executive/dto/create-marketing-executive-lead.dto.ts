import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMarketingExecutiveLeadDto {
  @ApiProperty({ type: 'string', description: 'Full Name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ type: 'string', description: 'Phone Number' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ type: 'string', description: 'House Address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Aadhar Front', required: false })
  @IsOptional()
  aadharCardPhoto?: any;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Latest Electricity Bill', required: false })
  @IsOptional()
  electricityBill?: any;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Customer Photograph', required: false })
  @IsOptional()
  customerPhotograph?: any;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Aadhar Back', required: false })
  @IsOptional()
  aadharCardBack?: any;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Cancel Cheque', required: false })
  @IsOptional()
  cancelCheque?: any;
}
