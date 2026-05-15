import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RoleMaster } from '../roles/entities/role.entity';
import { JwtStrategy } from '../auth/access-control/jwt.strategy';
import { AuthService } from '../auth/access-control/AuthServiceAuthGuard';
import { AccessControlModule } from '../auth/access-control/access-control.module';
import { JwtDatabaseAuthGuard } from '../auth/access-control/JwtDatabaseAuthGuard';
import { ContentMaster } from './entities/content-master.entity';
import { SectionMaster } from './entities/section-master.entity';
import { PageMaster } from './entities/page-master.entity';
import { ContactMaster } from './entities/contact-master.entity';
import { PartnerLogo } from './entities/partner-logo.entity';
import { BlogMaster } from './entities/city-rituals.entity';
import { FaqMaster } from './entities/faq.entity';
import { RolePageMapping } from './entities/role-page-section-mapping.entity';
import { HeaderMaster } from './entities/header.entity';
import { PageSeoKeywordMapping } from './entities/page-seo-keyword-mapping.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      RoleMaster,
      ContentMaster,
      PageMaster,
      SectionMaster,
      ContactMaster,
      PartnerLogo,
      BlogMaster,
      FaqMaster,
      RolePageMapping,
      HeaderMaster,
      PageSeoKeywordMapping,
    ]),
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
  controllers: [UserController],
  providers: [UserService, JwtStrategy, AuthService, JwtDatabaseAuthGuard],
  exports: [UserService],
})
export class UserModule {}
