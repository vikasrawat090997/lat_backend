import { IsNotEmpty, IsNumber, IsNumberString } from 'class-validator';

export class CreateRoleMenuMappingDto {
  @IsNotEmpty()
  @IsNumberString()
  roleId: string;

  @IsNotEmpty()
  @IsNumberString()
  menuId: string;
}
