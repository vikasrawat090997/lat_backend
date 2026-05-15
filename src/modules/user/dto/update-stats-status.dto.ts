import { IsNotEmpty, IsNumber, IsIn } from 'class-validator';

export class StatsUpdateStatusDto {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @IsNumber()
  @IsIn([0, 1, 2])
  status: number;
}
