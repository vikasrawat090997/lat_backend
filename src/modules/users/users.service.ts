import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
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
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';

@Injectable()
export class UsersService {
  private aiClient: GoogleGenerativeAI;
  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,

  ) {
    this.aiClient = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY!,
    );
  }

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

  private readonly evsKeywords = [
    'family',
    'home',
    'neighbourhood',
    'community',
    'plant',
    'tree',
    'flower',
    'leaf',
    'fruit',
    'animal',
    'bird',
    'insect',
    'habitat',
    'water',
    'air',
    'weather',
    'season',
    'food',
    'health',
    'hygiene',
    'cleanliness',
    'transport',
    'road safety',
    'environment',
    'nature',
    'surroundings',
    'recycling',
    'waste',
    'conservation'];
  async fetchCompetencies(dto: {
    gradeId: number;
    subjectId: number;
    term: string;
  }) {
    let targetGradeId = Number(dto.gradeId);
    let isEvsFallback = false;

    // Term 1 logic
    if (dto.term === 'Term 1') {
      if (targetGradeId === 6) targetGradeId = 5;
      else if (targetGradeId === 9) targetGradeId = 8;
      else if (targetGradeId === 12) targetGradeId = 11;
    }

    // EVS fallback condition
    if (
      Number(dto.gradeId) === 6 &&
      Number(dto.subjectId) === 6 &&
      dto.term === 'Term 1'
    ) {
      isEvsFallback = true;
    }

    let rows: any[] = [];

    if (isEvsFallback) {
      const query = `
      SELECT 
        c.id,
        c.name,
        c.description
      FROM competencymaster c
      WHERE c.gradeId = ?
        AND c.status = 1
    `;

      rows = await this.dataSource.query(query, [targetGradeId]);
      console.log(rows)
      if (!Array.isArray(rows)) {
        rows = [];
      }

      rows = rows.filter((comp) => {
        const textToSearch = `${comp.name || ''} ${comp.description || ''
          }`.toLowerCase();

        return this.evsKeywords.some((keyword) =>
          textToSearch.includes(keyword.toLowerCase()),
        );
      });

      if (rows.length === 0) {
        throw new NotFoundException(
          `No valid EVS fallback competencies matched the environmental criteria for Grade ${dto.gradeId}, Subject ID ${dto.subjectId}, ${dto.term}`,
        );
      }
    } else {
      const query = `
      SELECT
        c.id,
        c.name,
        c.description
      FROM competencymaster c
      INNER JOIN subjectcompetencymapping sc
        ON c.id = sc.competencyId
      WHERE c.gradeId = ?
        AND sc.subjectId = ?
        AND c.status = 1
        AND sc.status = 1
    `;

      rows = await this.dataSource.query(query, [
        targetGradeId,
        dto.subjectId,
      ]);

      if (!Array.isArray(rows) || rows.length === 0) {
        throw new NotFoundException(
          `No competencies found matching Grade ${dto.gradeId}, Subject ID ${dto.subjectId}, ${dto.term}`,
        );
      }
    }

    return {
      success: true,
      termApplied: dto.term,
      logicalSyllabusGradeId: targetGradeId,
      competencyCount: rows.length,
      data: rows,
    };
  }

  // async processBatchGeneration(dto: GenerateQuestionsDto) {
  //   // Step A: Fetch available competencies based on your grade, subject, and term rules
  //   const competencyData = await this.fetchCompetencies({
  //     gradeId: dto.displayGradeId,
  //     subjectId: dto.subjectId,
  //     term: dto.term
  //   });

  //   let targetCompetencies = [];

  //   // Condition Assessment: If array is empty [], assign ALL fetched competencies
  //   if (!dto.competencyIds || dto.competencyIds.length === 0) {
  //     targetCompetencies = competencyData.data;
  //   } else {
  //     // Otherwise, filter down to match only the IDs provided in the array
  //     targetCompetencies = competencyData.data.filter(c =>
  //       dto.competencyIds.includes(Number(c.id))
  //     );

  //     if (targetCompetencies.length === 0) {
  //       throw new BadRequestException(
  //         `None of the provided Competency IDs match this Grade/Term setup.`
  //       );
  //     }
  //   }

  //   const successfullyGeneratedQuestions = [];

  //   // Step B: Loop over evaluated targeting arrays
  //   for (const comp of targetCompetencies) {
  //     try {
  //       const cleanPrompt = `
  //         You are an elite academic assessment designer specializing in Competency-Based Education (CBE).
  //         Generate exactly ONE practical application multiple-choice question targeting this competency.

  //         PARAMETERS:
  //         - Target Student Grade: Grade ${dto.displayGradeId}
  //         - Academic Skill Level: Grade ${competencyData.logicalSyllabusGradeId}
  //         - Competency Focus: "${comp.name}"

  //         DESIGN RULES:
  //         1. Formulate a situational scenario forcing application over memorization.
  //         2. The question and individual options text MUST contain semantic HTML tags like <p>, <b>.
  //         3. Question context or distinct options can support images. If an element requires a visual representation to be solvable, flag "requires_image" to true and populate "image_prompt". Otherwise, declare false and null.

  //         OUTPUT FORMAT:
  //         Return strictly a single raw JSON object matching this schema blueprint:
  //         {
  //           "question_text": "HTML_STRING",
  //           "requires_image": true_or_false,
  //           "image_prompt": "PROMPT_OR_NULL",
  //           "correct_option": "A_B_C_OR_D",
  //           "options": [
  //             { "id": "A", "text": "HTML", "requires_image": true_or_false, "image_prompt": "PROMPT_OR_NULL" },
  //             { "id": "B", "text": "HTML", "requires_image": true_or_false, "image_prompt": "PROMPT_OR_NULL" },
  //             { "id": "C", "text": "HTML", "requires_image": true_or_false, "image_prompt": "PROMPT_OR_NULL" },
  //             { "id": "D", "text": "HTML", "requires_image": true_or_false, "image_prompt": "PROMPT_OR_NULL" }
  //           ]
  //         }
  //       `;

  //       const aiResponse = await this.aiClient.models.generateContent({
  //         model: 'gemini-1.5-flash', // Passed directly
  //         contents: [{ role: 'user', parts: [{ text: cleanPrompt }] }],
  //         config: { // Renamed from generationConfig to config
  //           temperature: 0.2,
  //           maxOutputTokens: 1000
  //         }
  //       });

  //       const textOutput = aiResponse.text ? aiResponse.text.trim() : '';
  //       if (!textOutput) continue;
  //       const cleanedJsonString = textOutput.replace(/^```json\s*|```$/g, '');
  //       const parsedData = JSON.parse(cleanedJsonString);

  //       // Atomic multi-table write sequence managed via TypeORM transaction utilities
  //       const savedRecord = await this.saveQuestionToDatabase(
  //         dto.displayGradeId,
  //         competencyData.logicalSyllabusGradeId,
  //         dto.subjectId,
  //         comp.id,
  //         parsedData
  //       );

  //       successfullyGeneratedQuestions.push(savedRecord);
  //     } catch (error) {
  //       console.error(`Failed question processing loop for Competency ID ${comp.id}:`, error.message);
  //     }
  //   }

  //   return {
  //     success: true,
  //     totalProcessedCompetencies: targetCompetencies.length,
  //     totalSuccessfullySaved: successfullyGeneratedQuestions.length,
  //     questions: successfullyGeneratedQuestions
  //   };
  // }

  async processBatchGeneration(dto: GenerateQuestionsDto) {
    // Step A: Fetch available competencies based on your grade, subject, and term rules
    const competencyData = await this.fetchCompetencies({
      gradeId: dto.displayGradeId,
      subjectId: dto.subjectId,
      term: dto.term
    });

    let targetCompetencies = [];

    if (!dto.competencyIds || dto.competencyIds.length === 0) {
      targetCompetencies = competencyData.data;
    } else {
      targetCompetencies = competencyData.data.filter(c =>
        dto.competencyIds.includes(Number(c.id))
      );
      if (targetCompetencies.length === 0) {
        throw new BadRequestException(`None of the provided Competency IDs match this context.`);
      }
    }

    // 🎯 Step B: Look up targeted question generation counts from configuration database mapping table
    const configQuery = `
      SELECT mandatory_question_count as count FROM grade_subject_question_mapping where grade_id = ? and subject_id = ?;
    `;
    const configResult = await this.dataSource.query(configQuery, [dto.displayGradeId, dto.subjectId]);

    // Fallback to 1 question per competency if no explicit mapping configuration row exists
    let targetedGenCount = (configResult && configResult.length > 0)
      ? Number(configResult[0].count)
      : 1;

    const model = this.aiClient.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });
    const successfullyGeneratedQuestions = [];
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    // Step C: Loop over evaluated targeting competencies
    for (const comp of targetCompetencies) {
      let remainingQuestionsToProcess = targetedGenCount;

      // 🔄 Step D: Chunking logic loop (Limits requests to max 5 items per system prompt call)
      while (remainingQuestionsToProcess > 0) {
        const currentBatchSize = Math.min(remainingQuestionsToProcess, 5);
        remainingQuestionsToProcess -= currentBatchSize;

        try {
          // const cleanPrompt = `
          //   You are an elite academic assessment designer specializing in Competency-Based Education (CBE).
          //   Generate exactly ${currentBatchSize} unique practical application multiple-choice questions targeting this specific competency.

          //   PARAMETERS:
          //   - Target Student Grade: Grade ${dto.displayGradeId}
          //   - Academic Skill Level: Grade ${competencyData.logicalSyllabusGradeId}
          //   - Competency Focus: "${comp.name}"

          //   DESIGN RULES:
          //   1. Formulate distinct, situational scenarios forcing application over memorization.
          //   2. The question and individual options text MUST contain semantic HTML tags like <p>, <b>.
          //   3. Elements can support images. If a visual component is mandatory to solve a question, flag "requires_image" to true and populate "image_prompt". Otherwise, declare false and null.

          //   OUTPUT FORMAT:
          //   Return strictly a raw JSON array containing exactly ${currentBatchSize} JSON items. Do NOT wrap it inside markdown blocks and do NOT add text commentary.
          //   The structure must exactly match this blueprint format:
          //   [
          //     {
          //       "question_text": "HTML_STRING",
          //       "requires_image": true_or_false,
          //       "image_prompt": "PROMPT_OR_NULL",
          //       "correct_option": "A_B_C_OR_D",
          //       "options": [
          //         { "id": "A", "text": "HTML", "requires_image": true_or_false, "image_prompt": "PROMPT_OR_NULL" },
          //         { "id": "B", "text": "HTML", "requires_image": true_or_false, "image_prompt": "PROMPT_OR_NULL" },
          //         { "id": "C", "text": "HTML", "requires_image": true_or_false, "image_prompt": "PROMPT_OR_NULL" },
          //         { "id": "D", "text": "HTML", "requires_image": true_or_false, "image_prompt": "PROMPT_OR_NULL" }
          //       ]
          //     }
          //   ]
          // `;

          //           const cleanPrompt = `
          // Generate ${currentBatchSize} competency-based MCQs.

          // Grade: ${dto.displayGradeId}
          // Skill Level: ${competencyData.logicalSyllabusGradeId}
          // Competency: ${comp.name}

          // Rules:
          // - Real-life application questions only.
          // - Avoid memorization and direct textbook recall.
          // - Use <p> and <b> HTML tags.
          // - 4 options (A,B,C,D).
          // - Exactly one correct answer.
          // - Create image-based questions whenever visuals improve understanding (objects, plants, animals, maps, shapes, patterns, surroundings, activities, comparisons, observations).
          // - If image needed:
          //   "requires_image": true
          //   and provide "image_prompt".
          // - Otherwise:
          //   "requires_image": false
          //   and "image_prompt": null.
          // - Return JSON only. No markdown.

          // Format:
          // [
          //  {
          //   "question_text":"",
          //   "requires_image":true,
          //   "image_prompt":required,
          //   "correct_option":"A",
          //   "options":[
          //    {"id":"A","text":"","requires_image":false,"image_prompt":null},
          //    {"id":"B","text":"","requires_image":false,"image_prompt":null},
          //    {"id":"C","text":"","requires_image":false,"image_prompt":null},
          //    {"id":"D","text":"","requires_image":false,"image_prompt":null}
          //   ]
          //  }
          // ]
          // `;

          const cleanPrompt = `
Generate ${currentBatchSize} competency-based MCQs.

Grade: ${dto.displayGradeId}
Skill Level: ${competencyData.logicalSyllabusGradeId}
Competency: ${comp.name}

Rules:
- Real-life application questions only.
- Avoid memorization and direct textbook recall.
- Use <p> and <b> HTML tags.
- Exactly 4 options (A,B,C,D).
- Exactly 1 correct answer.

IMAGE RULES:
- Decide independently whether the QUESTION requires an image.
- Decide independently whether any OPTION requires an image.
- Images should be used when they improve assessment quality.
- Use images for:
  plants, animals, objects, shapes, maps, patterns,
  measurements, comparisons, observations,
  surroundings, activities, community places,
  weather, transport and real-life situations.

QUESTION IMAGE:
- If question requires image:
  "requires_image": true
  and generate detailed "image_prompt".
- Otherwise:
  "requires_image": false
  and "image_prompt": null.

OPTION IMAGE:
- Each option may also require an image.
- If option requires image:
  "requires_image": true
  and generate detailed "image_prompt".
- Otherwise:
  "requires_image": false
  and "image_prompt": null.

Return JSON only.
No markdown.
No explanation.

Format:
[
  {
    "question_text":"",
    "requires_image":true,
    "image_prompt":"",

    "correct_option":"A",

    "options":[
      {
        "id":"A",
        "text":"",
        "requires_image":true,
        "image_prompt":""
      },
      {
        "id":"B",
        "text":"",
        "requires_image":false,
        "image_prompt":null
      },
      {
        "id":"C",
        "text":"",
        "requires_image":false,
        "image_prompt":null
      },
      {
        "id":"D",
        "text":"",
        "requires_image":false,
        "image_prompt":null
      }
    ]
  }
]
`;
          console.log(cleanPrompt);
          const aiResponse = await model.generateContent(cleanPrompt);


          const textOutput = aiResponse.response.text();
          console.log(textOutput);
          // return
          if (!textOutput) continue;

          const cleanedJsonString = textOutput.replace(/^```json\s*|```$/g, '');
          const parsedQuestionsArray = JSON.parse(cleanedJsonString);

          // Iterate and save every generated item returned in the sub-batch array
          if (Array.isArray(parsedQuestionsArray)) {
            // for (const singleQuestionData of parsedQuestionsArray) {
            //   const savedRecord = await this.saveQuestionToDatabase(
            //     dto.displayGradeId,
            //     competencyData.logicalSyllabusGradeId,
            //     dto.subjectId,
            //     comp.id,
            //     singleQuestionData
            //   );
            //   successfullyGeneratedQuestions.push(savedRecord);
            // }

            for (const comp of targetCompetencies) {
              try {

                const aiResponse = await model.generateContent(cleanPrompt);

                const textOutput = aiResponse.response.text();

                let cleanedJsonString = textOutput
                  .replace(/```json/g, '')
                  .replace(/```/g, '')
                  .trim();

                const parsedData = JSON.parse(cleanedJsonString);

                const questions = Array.isArray(parsedData)
                  ? parsedData
                  : [parsedData];

                for (const question of questions) {
                  const savedRecord =
                    await this.saveQuestionToDatabase(
                      dto.displayGradeId,
                      competencyData.logicalSyllabusGradeId,
                      dto.subjectId,
                      comp.id,
                      question,
                    );

                  successfullyGeneratedQuestions.push(savedRecord);
                }

                await delay(5000);

              } catch (error) {
                console.error(
                  `Competency ${comp.id} failed`,
                  error,
                );
              }
            }
          }


        } catch (error) {
          console.error(`Failed question sub-batch processing for Competency ID ${comp.id}:`, error.message);
          // If a sub-batch fails, break out or continue based on your error policy
        }
      }
    }

    return {
      success: true,
      totalCompetenciesProcessed: targetCompetencies.length,
      targetQuestionsPerCompetency: targetedGenCount,
      totalSuccessfullySaved: successfullyGeneratedQuestions.length,
      questions: successfullyGeneratedQuestions
    };
  }

  private async saveQuestionToDatabase(
    displayGradeId: number,
    syllabusGradeId: number,
    subjectId: number,
    competencyId: number,
    aiData: any // Handles dynamic structural mapping implicitly without strict interfaces
  ) {
    // 1. Initialize QueryRunner to guarantee absolute transactional safety
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Establish context-level image tracking properties
      const qImageStatus = aiData.requires_image ? 'pending' : 'none';

      // 2. Insert primary record parameters directly into the 'questions' table
      const insertQuestionSql = `
        INSERT INTO questions 
        (display_grade, syllabus_grade, subject_id, competency_targeted_id, question_text, requires_image, image_prompt, image_status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const questionInsertResult = await queryRunner.query(insertQuestionSql, [
        displayGradeId,
        syllabusGradeId,
        subjectId,
        competencyId,
        aiData.question_text,
        aiData.requires_image ? 1 : 0,
        aiData.image_prompt,
        qImageStatus
      ]);

      // Retrieve the auto-incremented primary ID generated for the newly created question row
      const questionId = questionInsertResult.insertId;

      // 3. Prepare the query layout statement for multiple choice option mapping rows
      const insertOptionSql = `
        INSERT INTO question_options 
        (question_id, option_letter, option_text, isCorrect, requires_image, image_prompt, image_status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      // Loop across each element within the choices array provided by Gemini
      for (const opt of aiData.options) {
        // Dynamically compute the binary state flag directly per row map index
        const isThisOptionCorrect = opt.id === aiData.correct_option ? 1 : 0;
        const optImageStatus = opt.requires_image ? 'pending' : 'none';

        await queryRunner.query(insertOptionSql, [
          questionId,
          opt.id,
          opt.text,
          isThisOptionCorrect,      // 🎯 Persists true (1) if it matches the correct answer letter
          opt.requires_image ? 1 : 0,
          opt.image_prompt,
          optImageStatus            // 🖼️ Sets 'pending' if this specific option needs an image generated
        ]);
      }

      // 4. Commit all updates atomically if every single row write finishes successfully
      await queryRunner.commitTransaction();

      // Return unified payload shape back to the orchestrator array loop
      return {
        id: questionId,
        displayGrade: displayGradeId,
        syllabusGrade: syllabusGradeId,
        subjectId: subjectId,
        competencyId: competencyId,
        question_text: aiData.question_text,
        image_status: qImageStatus,
        options: aiData.options.map((o: any) => ({
          letter: o.id,
          text: o.text,
          isCorrect: o.id === aiData.correct_option,
          image_status: o.requires_image ? 'pending' : 'none'
        }))
      };

    } catch (dbError) {
      // 5. Instantly roll back every single database change if any row execution crashes
      await queryRunner.rollbackTransaction();
      throw dbError;
    } finally {
      // 6. Always release connection properties back into the baseline thread pool manager
      await queryRunner.release();
    }
  }
}
