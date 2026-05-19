import { Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuMaster } from './entities/menu.entity';
import { AccessControlModule } from '../auth/access-control/access-control.module';
import { AuthService } from '../auth/access-control/AuthServiceAuthGuard';
import { JwtDatabaseAuthGuard } from '../auth/access-control/JwtDatabaseAuthGuard';
import { UserMaster } from '../users/entities/user.entity';
import { RoleMenuMapping } from '../role-menu-mapping/entities/role-menu-mapping.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MenuMaster, UserMaster, RoleMenuMapping]),
    AccessControlModule,
  ],
  controllers: [MenuController],
  providers: [MenuService, AuthService, JwtDatabaseAuthGuard],
  exports: [MenuService],
})
export class MenuModule {}
