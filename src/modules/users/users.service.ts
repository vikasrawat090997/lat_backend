import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) { }

  async login(dto: LoginDto) {
    const query = `
      SELECT
        u.id,
        u.username,
        u.firstName,
        u.lastName,
        u.email,
        u.mobileNo,
        u.password,
        u.roleId,
        r.name AS roleName
      FROM usermaster u
      INNER JOIN rolemaster r
        ON r.id = u.roleId
      WHERE u.username = ?
      AND u.status = 1
      LIMIT 1
    `;

    const users = await this.dataSource.query(query, [
      dto.username,
    ]);

    if (!users.length) {
      throw new UnauthorizedException(
        'Invalid username or password',
      );
    }

    const user = users[0];

    const passwordMatched = await bcrypt.compare(
      dto.password,
      user.password,
    );

    if (!passwordMatched) {
      throw new UnauthorizedException(
        'Invalid username or password',
      );
    }

    const payload = {
      userId: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.roleName,
    };

    const token = await this.jwtService.signAsync(payload);

    delete user.password;

    return {
      success: true,
      message: 'Login successful',
      accessToken: token,
      user,
    };
  }

  async getGradeGroupList() {
    const query = `
    SELECT
      id,
      name,
      priority
    FROM gradegroupmaster
    WHERE status = 1
    ORDER BY priority ASC
  `;

    const result = await this.dataSource.query(query);

    return {
      success: true,
      data: result,
    };
  }

  async getGradesByGradeGroup(gradeGroupId: number) {
    const query = `
    SELECT
      id,
      name,
      code,
      priority
    FROM grademaster
    WHERE gradeGroupId = ?
      AND status = 1
    ORDER BY priority ASC
  `;

    const result = await this.dataSource.query(query, [
      gradeGroupId,
    ]);

    return {
      success: true,
      data: result,
    };
  }

  async getRegionList() {
    const query = `
      SELECT
        id,
        name,
        code
      FROM regionmaster
      WHERE status = 1
      ORDER BY name ASC
    `;

    const result = await this.dataSource.query(query);

    return {
      success: true,
      data: result,
    };
  }

  async getSchoolsByRegion(regionId: number, udisecode?: string) {
    let query = `
      SELECT
        id,
        regionId,
        udiseCode,
        schoolName
      FROM schoolmaster
      WHERE regionId = ?
        AND status = 1
    `;

    const queryParams: any[] = [regionId];

    if (udisecode) {
      query += ` AND udiseCode LIKE ?`;
      queryParams.push(`%${udisecode}%`);
    }

    query += ` ORDER BY schoolName ASC`;

    const result = await this.dataSource.query(query, queryParams);

    return {
      success: true,
      data: result,
    };
  }
}
