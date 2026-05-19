import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  Put,
} from '@nestjs/common';
import { RoleMenuMappingService } from './role-menu-mapping.service';
import { CreateRoleMenuMappingDto } from './dto/create-role-menu-mapping.dto';
import { UpdateRoleMenuMappingDto } from './dto/update-role-menu-mapping.dto';
import { JwtDatabaseAuthGuard } from '../auth/access-control/JwtDatabaseAuthGuard';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';

@UseGuards(JwtAuthGuard)
@Controller('role-menu-mapping')
export class RoleMenuMappingController {
  constructor(
    private readonly roleMenuMappingService: RoleMenuMappingService,
  ) {}
}
