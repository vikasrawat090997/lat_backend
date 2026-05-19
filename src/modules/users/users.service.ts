import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserMaster } from './entities/user.entity';
import { DataSource, In, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RoleMaster } from '../roles/entities/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserMaster)
    private readonly userRepository: Repository<UserMaster>,
    private readonly jwtService: JwtService,
    @InjectRepository(RoleMaster)
    private readonly roleMasterRepository: Repository<RoleMaster>,
  ) {}

  async login(userName: string, password: string) {
    try {
      const user: any = await this.userRepository
        .createQueryBuilder('user')
        .innerJoinAndSelect('user.role', 'rm')
        .where('user.email = :userName OR user.phone = :userName', { userName })
        .getOne();
      if (!user) {
        throw new HttpException('User Not Found', HttpStatus.NOT_FOUND);
      }
      if (user.status !== 1) {
        throw new HttpException('Inactive user', HttpStatus.UNAUTHORIZED);
      }
      if (!user.password) {
        throw new HttpException('Password not set', HttpStatus.UNAUTHORIZED);
      }

      const passwordStatus = await bcrypt.compare(password, user.password);
      if (!passwordStatus) {
        throw new HttpException('Invalid Credentials', HttpStatus.UNAUTHORIZED);
      }

      delete user.password;

      const token = this.jwtService.sign({
        userId: user.id,
        email: user.email,
        roleId: user.role.id,
      });
      return {
        token: token,
        Message: 'Login Successfully',
        data: user,
      };
    } catch (err: any) {
      if (err.status) {
        throw err;
      }
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
