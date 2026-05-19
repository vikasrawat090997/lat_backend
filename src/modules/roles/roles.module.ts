// roles.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { RoleMaster } from './entities/role.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from '../auth/access-control/AuthServiceAuthGuard';
import { JwtDatabaseAuthGuard } from '../auth/access-control/JwtDatabaseAuthGuard';
import { UserMaster } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoleMaster, UserMaster])],
  controllers: [RolesController],
  providers: [RolesService, AuthService, JwtDatabaseAuthGuard],
  exports: [RolesService],
})
export class RolesModule {}
