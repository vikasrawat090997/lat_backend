import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { UserMaster } from 'src/modules/users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserMaster)
    private userMasterRepository: Repository<UserMaster>,
  ) {}

  async validateToken(token: string): Promise<boolean> {
    const tokenEntry = await this.userMasterRepository.findOne({
      where: { token: token },
    });
    if (!tokenEntry) {
      throw new UnauthorizedException('Invalid token');
    }
    try {
      // Verify token using JWT_SECRETKEY
      const decoded = jwt.verify(token, process.env.JWT_SECRETKEY);
      return true;
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      } else if (err.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token is invalid');
      }
      return false;
    }
  }
}
