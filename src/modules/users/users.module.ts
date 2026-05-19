import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserMaster } from './entities/user.entity';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AccessControlModule } from '../auth/access-control/access-control.module';
import { JwtStrategy } from '../auth/access-control/jwt.strategy';
import { RoleMaster } from '../roles/entities/role.entity';

import { AuthService } from '../auth/access-control/AuthServiceAuthGuard';
import { JwtDatabaseAuthGuard } from '../auth/access-control/JwtDatabaseAuthGuard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserMaster, RoleMaster]),
    PassportModule,
    ConfigModule.forRoot(),
    JwtModule.register({
      secret: process.env['JWT_SECRETKEY'],
      signOptions: {
        // expiresIn: process.env['JWT_EXPIRESIN']
        expiresIn: Number(process.env.JWT_EXPIRESIN),
      },
    }),
    AccessControlModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtStrategy, AuthService, JwtDatabaseAuthGuard],
  exports: [UsersService],
})
export class UsersModule {}
