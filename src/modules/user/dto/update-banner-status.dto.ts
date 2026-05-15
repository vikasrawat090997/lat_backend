import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBannerStatusDto {
  @ApiProperty({ example: 1, description: '0=Disable, 1=Enable, 2=Delete' })
  @IsString()
  @IsIn(['0', '1', '2'])
  status: string;
}
