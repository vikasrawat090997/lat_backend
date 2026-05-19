import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleMaster } from './entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { UserMaster } from '../users/entities/user.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleMaster)
    private readonly roleMasterRepository: Repository<RoleMaster>,
    @InjectRepository(UserMaster)
    private readonly userMasterRepository: Repository<UserMaster>,
  ) {}

  async findAll(userId: string) {
    try {
      // ✅ get user with role
      const user = await this.userMasterRepository.findOne({
        where: { id: userId },
        relations: ['role'],
      });
      const qb = this.roleMasterRepository
        .createQueryBuilder('r')
        .innerJoin('r.userType', 'ut')
        .select([
          'r.id AS id',
          'r.name AS roleName',
          'ut.id AS userTypeId',
          'ut.name AS userTypeName',
          'r.createdAt AS createdAt',
          'r.status AS status',
        ])
        .where('r.status IN (0,1)');

      // ✅ condition
      if (+user?.role?.id == 2) {
        qb.andWhere('r.id = :roleId', { roleId: 3 });
      }

      const result = await qb.getRawMany();

      return result;

      return result;
    } catch (err) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async findOne(id: string) {
    try {
      const result = await this.roleMasterRepository
        .createQueryBuilder('r')
        .innerJoin('r.userType', 'ut')
        .select([
          'r.id AS id',
          'r.name AS roleName',
          'ut.id AS userTypeId',
          'ut.name AS userTypeName',
          'r.createdAt AS createdAt',
          'r.status AS status',
        ])
        .where('r.id = :id', { id })
        .getRawOne();

      return result;
    } catch (err) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }
}
