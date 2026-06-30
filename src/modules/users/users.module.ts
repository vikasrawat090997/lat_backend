import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MailService } from './mail.service';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AccessControlModule } from '../auth/access-control/access-control.module';
import { JwtStrategy } from '../auth/access-control/jwt.strategy';

import { AuthService } from '../auth/access-control/AuthServiceAuthGuard';
import { JwtDatabaseAuthGuard } from '../auth/access-control/JwtDatabaseAuthGuard';
import { UserMaster } from './entities/user.entity';
import { StudentExam } from './entities/student_exam.entity';
import { StudentExamQuestion } from './entities/student_exam_question.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserMaster, StudentExam, StudentExamQuestion]),
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
  providers: [UsersService, MailService, JwtStrategy, AuthService, JwtDatabaseAuthGuard],
  exports: [UsersService, MailService],
})
export class UsersModule { }
