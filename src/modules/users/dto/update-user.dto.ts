import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsString()
  userTypeId: string;

  @IsNotEmpty()
  @IsString()
  roleId: string;
}
