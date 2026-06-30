import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewQuestionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  questionId: number;

  @ApiProperty({ description: '1 = Approve, 0 = Reject' })
  @IsNotEmpty()
  @IsNumber()
  @IsIn([0, 1])
  status: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}
