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
import * as exceljs from 'exceljs';
import { LoginDto } from './dto/login.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

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

  async getSubjectList() {
    const query = `
      SELECT
        id,
        name,
        code,
        priority
      FROM subjectmaster
      WHERE status = 1
      ORDER BY priority ASC
    `;
    const result = await this.dataSource.query(query);
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

  async getTeacherList(page: number, limit: number, search?: string, regionId?: string, schoolId?: string) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT
        u.id as userId,
        u.firstName,
        u.lastName,
        u.email,
        u.mobileNo,
        tm.employeeCode,
        tm.udiseCode,
        tm.gender,
        tm.address,
        sm.schoolName,
        sm.regionId,
        rm.name as regionName,
        tm.schoolId
      FROM teachermaster tm
      INNER JOIN usermaster u ON u.id = tm.userId
      LEFT JOIN schoolmaster sm ON sm.id = tm.schoolId
      LEFT JOIN regionmaster rm ON rm.id = sm.regionId
      WHERE u.status = 1
    `;
    const params: any[] = [];
    if (search) {
      query += ` AND (u.firstName LIKE ? OR u.lastName LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (regionId) {
      query += ` AND sm.regionId = ?`;
      params.push(regionId);
    }
    if (schoolId) {
      query += ` AND tm.schoolId = ?`;
      params.push(schoolId);
    }
    query += ` ORDER BY u.firstName ASC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const result = await this.dataSource.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM teachermaster tm
      INNER JOIN usermaster u ON u.id = tm.userId
      LEFT JOIN schoolmaster sm ON sm.id = tm.schoolId
      WHERE u.status = 1
    `;
    const countParams: any[] = [];
    if (search) {
      countQuery += ` AND (u.firstName LIKE ? OR u.lastName LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }
    if (regionId) {
      countQuery += ` AND sm.regionId = ?`;
      countParams.push(regionId);
    }
    if (schoolId) {
      countQuery += ` AND tm.schoolId = ?`;
      countParams.push(schoolId);
    }
    const countResult = await this.dataSource.query(countQuery, countParams);

    return {
      success: true,
      data: result,
      total: Number(countResult[0].total),
      page: Number(page),
      limit: Number(limit),
    };
  }

  async createTeacher(dto: CreateTeacherDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { firstName, lastName, mobileNo, email, empCode, udisecode, gender, address, gradeId, subjectId } = dto;

      const username = `${firstName.charAt(0)}${mobileNo.substring(0, 4)}_${empCode}`;
      const rawPassword = `${firstName.substring(0, 2)}${mobileNo.slice(-4)}${email.substring(0, 4)}`;
      const password = await bcrypt.hash(rawPassword, 10);

      const userInsertResult = await queryRunner.query(
        `INSERT INTO usermaster (roleId, username, firstName, lastName, email, mobileNo, password, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [2, username, firstName, lastName, email, mobileNo, password, 1]
      );
      const userId = userInsertResult.insertId;

      const schoolResult = await queryRunner.query(
        `SELECT id FROM schoolmaster WHERE udiseCode = ? AND status = 1 LIMIT 1`,
        [udisecode]
      );
      if (!schoolResult || schoolResult.length === 0) {
        throw new BadRequestException(`School with UDISE code ${udisecode} not found`);
      }
      const schoolId = schoolResult[0].id;

      await queryRunner.query(
        `INSERT INTO teachermaster (userId, employeeCode, schoolId, udiseCode, gender, address, status, gradeId, subjectId)
         VALUES (?, ?, ?, ?, ?, ?, ?,?,?)`,
        [userId, empCode, schoolId, udisecode, gender, address, 1, gradeId, subjectId]
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Teacher created successfully',
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }

  async bulkUploadTeachers(file: Express.Multer.File) {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.worksheets[0];

    const results = {
      successCount: 0,
      failedCount: 0,
      errors: []
    };

    let isFirstRow = true;
    for (let i = 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      if (isFirstRow) {
        isFirstRow = false;
        continue;
      }

      const rowValues = row.values as any[];
      if (!rowValues || rowValues.length === 0) continue;

      try {
        const getVal = (val: any) => {
          if (!val) return '';
          if (val instanceof Date) {
            const dd = String(val.getDate()).padStart(2, '0');
            const mm = String(val.getMonth() + 1).padStart(2, '0');
            const yyyy = val.getFullYear();
            return `${dd}-${mm}-${yyyy}`;
          }
          if (typeof val === 'object') {
            return (val.text || val.hyperlink || '').toString();
          }
          return val.toString();
        };

        const dto = new CreateTeacherDto();
        dto.firstName = getVal(rowValues[1]);
        dto.lastName = getVal(rowValues[2]);
        dto.mobileNo = getVal(rowValues[3]);
        dto.email = getVal(rowValues[4]);
        dto.empCode = getVal(rowValues[5]);
        dto.udisecode = getVal(rowValues[6]);
        dto.gender = getVal(rowValues[7]);
        dto.address = getVal(rowValues[8]);
        dto.gradeId = getVal(rowValues[9]);
        dto.subjectId = getVal(rowValues[10]);

        if (!dto.firstName || !dto.mobileNo || !dto.empCode || !dto.udisecode || !dto.email) {
          throw new Error(`Missing required fields`);
        }

        await this.createTeacher(dto);
        results.successCount++;
      } catch (err) {
        results.failedCount++;
        results.errors.push(`Row ${i}: ${err.message}`);
      }
    }

    return {
      success: true,
      message: 'Bulk upload completed',
      data: results
    };
  }

  async updateTeacher(userId: number, dto: UpdateTeacherDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userCheck = await queryRunner.query(
        `SELECT id FROM usermaster WHERE id = ? LIMIT 1`,
        [userId]
      );
      if (!userCheck || userCheck.length === 0) {
        throw new BadRequestException(`Teacher with user ID ${userId} not found`);
      }

      const { firstName, lastName, mobileNo, email, empCode, udisecode, gender, address, gradeId, subjectId } = dto;

      if (firstName !== undefined || lastName !== undefined || email !== undefined || mobileNo !== undefined) {
        let updateQuery = `UPDATE usermaster SET `;
        const params: any[] = [];
        if (firstName !== undefined) { updateQuery += `firstName = ?, `; params.push(firstName); }
        if (lastName !== undefined) { updateQuery += `lastName = ?, `; params.push(lastName); }
        if (email !== undefined) { updateQuery += `email = ?, `; params.push(email); }
        if (mobileNo !== undefined) { updateQuery += `mobileNo = ?, `; params.push(mobileNo); }
        updateQuery = updateQuery.slice(0, -2) + ` WHERE id = ?`;
        params.push(userId);
        await queryRunner.query(updateQuery, params);
      }

      if (empCode !== undefined || udisecode !== undefined || gender !== undefined || address !== undefined || gradeId !== undefined || subjectId !== undefined) {
        let updateQuery = `UPDATE teachermaster SET `;
        const params: any[] = [];
        if (empCode !== undefined) { updateQuery += `employeeCode = ?, `; params.push(empCode); }
        if (gender !== undefined) { updateQuery += `gender = ?, `; params.push(gender); }
        if (address !== undefined) { updateQuery += `address = ?, `; params.push(address); }
        if (gradeId !== undefined) { updateQuery += `gradeId = ?, `; params.push(gradeId); }
        if (subjectId !== undefined) { updateQuery += `subjectId = ?, `; params.push(subjectId); }

        if (udisecode !== undefined) {
          const schoolResult = await queryRunner.query(
            `SELECT id FROM schoolmaster WHERE udiseCode = ? AND status = 1 LIMIT 1`,
            [udisecode]
          );
          if (!schoolResult || schoolResult.length === 0) {
            throw new BadRequestException(`School with UDISE code ${udisecode} not found`);
          }
          updateQuery += `udiseCode = ?, schoolId = ?, `;
          params.push(udisecode, schoolResult[0].id);
        }

        updateQuery = updateQuery.slice(0, -2) + ` WHERE userId = ?`;
        params.push(userId);
        await queryRunner.query(updateQuery, params);
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Teacher updated successfully',
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }

  async toggleTeacherStatus(userId: number, status: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userCheck = await queryRunner.query(
        `SELECT id FROM usermaster WHERE id = ? LIMIT 1`,
        [userId]
      );
      if (!userCheck || userCheck.length === 0) {
        throw new BadRequestException(`Teacher with user ID ${userId} not found`);
      }

      await queryRunner.query(
        `UPDATE usermaster SET status = ? WHERE id = ?`,
        [status, userId]
      );
      await queryRunner.query(
        `UPDATE teachermaster SET status = ? WHERE userId = ?`,
        [status, userId]
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Teacher status updated successfully`,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }

  async getStudentList(page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT
        u.id as userId,
        u.firstName,
        u.lastName,
        u.email,
        u.mobileNo as parentMobile,
        sm.rollNo,
        sm.gradeId,
        sm.section,
        sm.udiseCode,
        sm.fatherName,
        sm.motherName,
        sm.gender,
        sm.dob,
        sm.address, u.status
      FROM studentmaster sm
      INNER JOIN usermaster u ON u.id = sm.userId
      WHERE u.status = 1
    `;
    const params: any[] = [];
    if (search) {
      query += ` AND (u.firstName LIKE ? OR u.lastName LIKE ? OR sm.fatherName LIKE ? OR sm.motherName LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ` ORDER BY u.firstName ASC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const result = await this.dataSource.query(query, params);

    let countQuery = `
      SELECT COUNT(*) as total
      FROM studentmaster sm
      INNER JOIN usermaster u ON u.id = sm.userId
      WHERE u.status = 1
    `;
    const countParams: any[] = [];
    if (search) {
      countQuery += ` AND (u.firstName LIKE ? OR u.lastName LIKE ? OR sm.fatherName LIKE ? OR sm.motherName LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const countResult = await this.dataSource.query(countQuery, countParams);

    return {
      success: true,
      data: result,
      total: Number(countResult[0].total),
      page: Number(page),
      limit: Number(limit),
    };
  }

  async createStudent(dto: CreateStudentDto, createdBy: number | null) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { firstName, lastName, parentMobile, email, rollNo, gradeId, section, udisecode, fatherName, motherName, gender, dob, address } = dto;

      const first2 = (firstName || '').substring(0, 2).toUpperCase();
      const mother2 = (motherName || '').substring(0, 2).toUpperCase();
      const father2 = (fatherName || '').substring(0, 2).toUpperCase();

      let dobClean = (dob || '').replace(/[-/]/g, '');
      let dobDDMM = '0101';
      let dobDbFormat = null;
      if (dobClean.length >= 8) {
        dobDDMM = dobClean.substring(0, 4);
        const dd = dobClean.substring(0, 2);
        const mm = dobClean.substring(2, 4);
        const yyyy = dobClean.substring(4, 8);
        dobDbFormat = `${yyyy}-${mm}-${dd}`;
      }

      const username = `${first2}${mother2}${father2}${dobDDMM}`;
      const last4Mobile = (parentMobile || '').slice(-4);
      const rawPassword = `${first2}${mother2}${father2}${last4Mobile}`;
      const password = await bcrypt.hash(rawPassword, 10);

      const userInsertResult = await queryRunner.query(
        `INSERT INTO usermaster (roleId, username, firstName, lastName, email, mobileNo, password, status, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [3, username, firstName, lastName, email || null, parentMobile, password, 1, createdBy]
      );
      const userId = userInsertResult.insertId;

      await queryRunner.query(
        `INSERT INTO studentmaster (userId, rollNo, gradeId, section, udiseCode, fatherName, motherName, gender, dob, address, createdBy, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, rollNo || null, gradeId, section || null, udisecode, fatherName || null, motherName || null, gender || null, dobDbFormat, address || null, createdBy, 1]
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Student created successfully',
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }

  async bulkUploadStudents(file: Express.Multer.File, createdBy: number | null) {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.worksheets[0];

    const results = {
      successCount: 0,
      failedCount: 0,
      errors: []
    };

    let isFirstRow = true;
    for (let i = 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      if (isFirstRow) {
        isFirstRow = false;
        continue;
      }

      const rowValues = row.values as any[];
      if (!rowValues || rowValues.length === 0) continue;

      try {
        const getVal = (val: any) => {
          if (!val) return '';
          if (val instanceof Date) {
            const dd = String(val.getDate()).padStart(2, '0');
            const mm = String(val.getMonth() + 1).padStart(2, '0');
            const yyyy = val.getFullYear();
            return `${dd}-${mm}-${yyyy}`;
          }
          if (typeof val === 'object') {
            return (val.text || val.hyperlink || '').toString();
          }
          return val.toString();
        };

        const dto = new CreateStudentDto();
        dto.firstName = getVal(rowValues[1]);
        dto.lastName = getVal(rowValues[2]);
        dto.parentMobile = getVal(rowValues[3]);
        dto.email = getVal(rowValues[4]);
        dto.rollNo = getVal(rowValues[5]);
        dto.gradeId = Number(getVal(rowValues[6])) || 0;
        dto.section = getVal(rowValues[7]);
        dto.udisecode = getVal(rowValues[8]);
        dto.fatherName = getVal(rowValues[9]);
        dto.motherName = getVal(rowValues[10]);
        dto.gender = getVal(rowValues[11]);
        dto.dob = getVal(rowValues[12]);
        dto.address = getVal(rowValues[13]);

        if (!dto.firstName || !dto.parentMobile || !dto.udisecode || !dto.gradeId) {
          throw new Error(`Missing required fields`);
        }

        await this.createStudent(dto, createdBy);
        results.successCount++;
      } catch (err) {
        results.failedCount++;
        results.errors.push(`Row ${i}: ${err.message}`);
      }
    }

    return {
      success: true,
      message: 'Bulk upload completed',
      data: results
    };
  }

  async updateStudent(userId: number, dto: UpdateStudentDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userCheck = await queryRunner.query(
        `SELECT id FROM usermaster WHERE id = ? LIMIT 1`,
        [userId]
      );
      if (!userCheck || userCheck.length === 0) {
        throw new BadRequestException(`Student with user ID ${userId} not found`);
      }

      const { firstName, lastName, parentMobile, email, rollNo, gradeId, section, udisecode, fatherName, motherName, gender, dob, address } = dto;

      if (firstName !== undefined || lastName !== undefined || email !== undefined || parentMobile !== undefined) {
        let updateQuery = `UPDATE usermaster SET `;
        const params: any[] = [];
        if (firstName !== undefined) { updateQuery += `firstName = ?, `; params.push(firstName); }
        if (lastName !== undefined) { updateQuery += `lastName = ?, `; params.push(lastName); }
        if (email !== undefined) { updateQuery += `email = ?, `; params.push(email); }
        if (parentMobile !== undefined) { updateQuery += `mobileNo = ?, `; params.push(parentMobile); }
        updateQuery = updateQuery.slice(0, -2) + ` WHERE id = ?`;
        params.push(userId);
        await queryRunner.query(updateQuery, params);
      }

      if (rollNo !== undefined || gradeId !== undefined || section !== undefined || udisecode !== undefined || fatherName !== undefined || motherName !== undefined || gender !== undefined || dob !== undefined || address !== undefined) {
        let updateQuery = `UPDATE studentmaster SET `;
        const params: any[] = [];
        if (rollNo !== undefined) { updateQuery += `rollNo = ?, `; params.push(rollNo); }
        if (gradeId !== undefined) { updateQuery += `gradeId = ?, `; params.push(gradeId); }
        if (section !== undefined) { updateQuery += `section = ?, `; params.push(section); }
        if (udisecode !== undefined) { updateQuery += `udiseCode = ?, `; params.push(udisecode); }
        if (fatherName !== undefined) { updateQuery += `fatherName = ?, `; params.push(fatherName); }
        if (motherName !== undefined) { updateQuery += `motherName = ?, `; params.push(motherName); }
        if (gender !== undefined) { updateQuery += `gender = ?, `; params.push(gender); }
        if (address !== undefined) { updateQuery += `address = ?, `; params.push(address); }

        if (dob !== undefined) {
          let dobClean = (dob || '').replace(/[-/]/g, '');
          let dobDbFormat = null;
          if (dobClean.length >= 8) {
            const dd = dobClean.substring(0, 2);
            const mm = dobClean.substring(2, 4);
            const yyyy = dobClean.substring(4, 8);
            dobDbFormat = `${yyyy}-${mm}-${dd}`;
          }
          updateQuery += `dob = ?, `; params.push(dobDbFormat);
        }

        updateQuery = updateQuery.slice(0, -2) + ` WHERE userId = ?`;
        params.push(userId);
        await queryRunner.query(updateQuery, params);
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Student updated successfully',
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }

  async toggleStudentStatus(userId: number, status: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userCheck = await queryRunner.query(
        `SELECT id FROM usermaster WHERE id = ? LIMIT 1`,
        [userId]
      );
      if (!userCheck || userCheck.length === 0) {
        throw new BadRequestException(`Student with user ID ${userId} not found`);
      }

      await queryRunner.query(
        `UPDATE usermaster SET status = ? WHERE id = ?`,
        [status, userId]
      );
      await queryRunner.query(
        `UPDATE studentmaster SET status = ? WHERE userId = ?`,
        [status, userId]
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Student status updated successfully`,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }
}
