import { PartialType } from '@nestjs/swagger';
import { CreateRoleMenuMappingDto } from './create-role-menu-mapping.dto';

export class UpdateRoleMenuMappingDto extends PartialType(CreateRoleMenuMappingDto) {}
