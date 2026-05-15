import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumberString } from 'class-validator';

class RolePageSectionItemDto {
  @IsNotEmpty()
  @IsNumberString()
  roleId: string;

  @IsNotEmpty()
  @IsNumberString()
  pageId: string;

  @IsNotEmpty()
  @IsNumberString()
  sectionId: string;
}

export class CreateRolePageSectionMappingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePageSectionItemDto)
  mappings: RolePageSectionItemDto[];
}
