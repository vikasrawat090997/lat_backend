import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateRoleMenuMappingDto } from './dto/create-role-menu-mapping.dto';
import { UpdateRoleMenuMappingDto } from './dto/update-role-menu-mapping.dto';
import { RoleMaster } from '../roles/entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { MenuMaster } from '../menu/entities/menu.entity';
import { RoleMenuMapping } from './entities/role-menu-mapping.entity';

@Injectable()
export class RoleMenuMappingService {
  constructor(
    @InjectRepository(RoleMaster)
    private readonly roleMasterRepository: Repository<RoleMaster>,

    @InjectRepository(MenuMaster)
    private readonly menuMasterRepository: Repository<MenuMaster>,

    @InjectRepository(RoleMenuMapping)
    private readonly roleMenuMappingRepository: Repository<RoleMenuMapping>,
  ) {}
}
