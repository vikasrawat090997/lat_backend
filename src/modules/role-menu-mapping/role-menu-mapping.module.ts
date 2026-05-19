import { forwardRef, Module } from '@nestjs/common';
import { RoleMenuMappingService } from './role-menu-mapping.service';
import { RoleMenuMappingController } from './role-menu-mapping.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuMaster } from '../menu/entities/menu.entity';
import { RoleMenuMapping } from './entities/role-menu-mapping.entity';
import { RoleMaster } from '../roles/entities/role.entity';
import { AccessControlModule } from '../auth/access-control/access-control.module';
import { AuthService } from '../auth/access-control/AuthServiceAuthGuard';
import { JwtDatabaseAuthGuard } from '../auth/access-control/JwtDatabaseAuthGuard';
import { UserMaster } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoleMaster,
      RoleMenuMapping,
      MenuMaster,
      UserMaster,
    ]),
    AccessControlModule,
  ],
  controllers: [RoleMenuMappingController],
  providers: [RoleMenuMappingService, AuthService, JwtDatabaseAuthGuard],
})
export class RoleMenuMappingModule {}
