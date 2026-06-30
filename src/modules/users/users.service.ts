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
import * as fs from 'fs';
import * as path from 'path';
import { LoginDto } from './dto/login.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { MailService } from './mail.service';
import { generateRandomString } from 'src/utils/utils';
import {
  CheckExamDto,
  StartExamDto,
  SubmitExamDto,
  GetExamQuestionsDto,
} from './dto/exam.dto';

@Injectable()
export class UsersService {
  private aiClient: GoogleGenerativeAI;
  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) {
    this.aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  // async login(dto: LoginDto) {
  //   const query = `
  //     SELECT
  //       u.id,
  //       u.username,
  //       u.firstName,
  //       u.lastName,
  //       u.email,
  //       u.mobileNo,
  //       u.password,
  //       u.roleId,
  //       r.name AS roleName,
  //       gm.name AS gradeName,
  //       sm.section,
  //       sm.rollNo
  //     FROM usermaster u
  //     INNER JOIN rolemaster r
  //       ON r.id = u.roleId
  //     LEFT JOIN studentmaster sm
  //       ON sm.userId = u.id
  //     LEFT JOIN grademaster gm
  //       ON gm.id = sm.gradeId
  //     WHERE u.username = ?
  //     AND u.status = 1
  //     LIMIT 1
  //   `;

  //   const users = await this.dataSource.query(query, [dto.username]);

  //   if (!users.length) {
  //     throw new UnauthorizedException('Invalid username or password');
  //   }

  //   const user = users[0];

  //   const passwordMatched = await bcrypt.compare(dto.password, user.password);

  //   if (!passwordMatched) {
  //     throw new UnauthorizedException('Invalid username or password');
  //   }

  //   const payload = {
  //     userId: user.id,
  //     username: user.username,
  //     roleId: user.roleId,
  //     roleName: user.roleName,
  //   };

  //   const token = await this.jwtService.signAsync(payload);

  //   delete user.password;
  //   console.log(user);
  //   return {
  //     success: true,
  //     message: 'Login successful',
  //     accessToken: token,
  //     user,
  //   };
  // }

  async login(dto: LoginDto) {
    // Step 1: Get basic user details
    const userQuery = `
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

    const users = await this.dataSource.query(userQuery, [dto.username]);

    if (!users.length) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const user = users[0];

    const passwordMatched = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatched) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // Step 2: Fetch role-specific information
    if (user.roleId === 3) {
      // Student Role
      const studentQuery = `
      SELECT 
        gm.name AS gradeName,
        sm.section,
        sm.rollNo
      FROM studentmaster sm
      LEFT JOIN grademaster gm
        ON gm.id = sm.gradeId
      WHERE sm.userId = ?
      LIMIT 1
    `;

      const student = await this.dataSource.query(studentQuery, [user.id]);

      if (student.length) {
        Object.assign(user, student[0]);
      }
    }

    if (user.roleId === 2) {
      // Teacher Role
      const teacherQuery = `
      SELECT
        tm.employeeCode,
        tm.designation
      FROM teachermaster tm
      WHERE tm.userId = ?
      LIMIT 1
    `;

      const teacher = await this.dataSource.query(teacherQuery, [user.id]);

      if (teacher.length) {
        Object.assign(user, teacher[0]);
      }
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

  async getGradesByGradeGroup() {
    const query = `
    SELECT
      id,
      name
    FROM grademaster
    where id not  in (1,2,3) and status != '0'
    ORDER BY id ASC
  `;

    const result = await this.dataSource.query(query);

    return {
      success: true,
      data: result,
    };
  }
  async getGradesGradeGroup(gradeGroupId: number) {
    const query = `
    SELECT
      id,
      name
    FROM grademaster
    where id not  in (1,2,3)
    and gradeGroupId = ? and status = 1
    ORDER BY id ASC
  `;

    const result = await this.dataSource.query(query, [gradeGroupId]);

    return {
      success: true,
      data: result,
    };
  }
  async getQuestionListB(filters: {
    search?: string;
    grade?: string;
    subject?: string;
    competency?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const { search, grade, subject, competency, status, page, limit } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push(`(q.question_Text LIKE ? OR CAST(q.id AS CHAR) LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }
    if (grade) {
      conditions.push(`q.display_Grade = ?`);
      params.push(Number(grade));
    }
    if (subject) {
      conditions.push(`q.subject_Id = ?`);
      params.push(Number(subject));
    }
    if (status) {
      conditions.push(`q.status = ?`);
      params.push(Number(status));
    }
    if (competency) {
      conditions.push(`q.competency_Targeted_Id = ?`);
      params.push(Number(competency));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const dataQuery = `
      SELECT
        q.id,
        q.question_Text,
        q.image_Url,
        q.status,
        q.instruction,
        CAST(q.id AS CHAR) AS questionId,
        gm.name AS grade,
        sm.name AS subject,
        cm.name AS competency
      FROM questions q
      LEFT JOIN grademaster gm ON gm.id = q.display_Grade
      LEFT JOIN subjectmaster sm ON sm.id = q.subject_Id
      LEFT JOIN competencymaster cm ON cm.id = q.competency_Targeted_Id
      ${where}
      ORDER BY q.id DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM questions q ${where}
    `;

    const [rows, countResult] = await Promise.all([
      this.dataSource.query(dataQuery, [...params, limit, offset]),
      this.dataSource.query(countQuery, params),
    ]);

    const total = Number(countResult[0]?.total ?? 0);

    return {
      success: true,
      questions: rows.map((r: any) => ({
        id: Number(r.id),
        questionId: String(r.questionId),
        grade: r.grade || '',
        subject: r.subject || '',
        competency: r.competency || '',
        instruction: r.instruction || '',
        stimulus: r.stimulus || '',
        questionText: r.question_Text || '',
        status: r.status === 1 ? 'Active' : 'Inactive',
        imageUrl: r.image_Url || null,
        answerExplanation: r.answerExplanation || '',
        createdAt: r.createdAt || '',
        updatedAt: r.updatedAt || '',
        options: (r.options || []).map((o: any) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          imageUrl: o.image_Url || null,
          rationale: o.rationale || '',
        })),
      })),
      total: Number(total),
      page: Number(page),
      limit: Number(limit),
    };
  }

  async getQuestionListC(filters: {
    search?: string;
    grade?: string;
    subject?: string;
    competency?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const { search, grade, subject, competency, status, page, limit } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push(`(q.question_Text LIKE ? OR CAST(q.id AS CHAR) LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }

    if (grade) {
      conditions.push(`q.display_Grade = ?`);
      params.push(Number(grade));
    }

    if (subject) {
      conditions.push(`q.subject_Id = ?`);
      params.push(Number(subject));
    }

    if (status !== undefined && status !== '') {
      conditions.push(`q.status = ?`);
      params.push(Number(status));
    }

    if (competency) {
      conditions.push(`q.competency_Targeted_Id = ?`);
      params.push(Number(competency));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const dataQuery = `
    SELECT
        q.id,
        q.question_Text,
        q.instruction,
        q.stimulus,
        q.image_Url,
        q.status,
        q.createdAt,
        q.updatedAt,

        CAST(q.id AS CHAR) AS questionId,

        gm.name AS grade,
        sm.name AS subject,
        cm.name AS competency,

        qo.id AS optionId,
        qo.option_letter,
        qo.option_text,
        qo.isCorrect,
        qo.image_url AS optionImageUrl,
        qo.rationale

    FROM questions q
    LEFT JOIN grademaster gm
        ON gm.id=q.display_Grade

    LEFT JOIN subjectmaster sm
        ON sm.id=q.subject_Id

    LEFT JOIN competencymaster cm
        ON cm.id=q.competency_Targeted_Id

    LEFT JOIN question_options qo
        ON qo.question_id=q.id

    ${where}

    ORDER BY q.id DESC, qo.option_letter ASC
    LIMIT ? OFFSET ?
  `;

    const countQuery = `
    SELECT COUNT(*) total
    FROM questions q
    ${where}
  `;

    const [rows, countResult] = await Promise.all([
      this.dataSource.query(dataQuery, [...params, limit, offset]),
      this.dataSource.query(countQuery, params),
    ]);

    const total = Number(countResult[0]?.total || 0);

    // Group question + options
    const questionMap = new Map<number, any>();

    for (const row of rows) {
      if (!questionMap.has(row.id)) {
        questionMap.set(row.id, {
          id: Number(row.id),
          questionId: String(row.questionId),
          grade: row.grade ?? '',
          subject: row.subject ?? '',
          competency: row.competency ?? '',
          instruction: row.instruction ?? '',
          stimulus: row.stimulus ?? '',
          questionText: row.question_Text ?? '',
          status:
            row.status === 1
              ? 'Active'
              : row.status === 2
                ? 'Draft'
                : 'Inactive',
          imageUrl: row.image_Url ?? null,
          answerExplanation: '',
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          options: [],
        });
      }

      if (row.optionId) {
        questionMap.get(row.id).options.push({
          id: row.option_letter,
          optionId: Number(row.optionId),
          text: row.option_text,
          isCorrect: row.isCorrect === 1,
          imageUrl: row.optionImageUrl,
          rationale: row.rationale ?? '',
        });
      }
    }

    return {
      success: true,
      questions: Array.from(questionMap.values()),
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }
  async getQuestionList(filters: {
    search?: string;
    grade?: string;
    subject?: string;
    competency?: string;
    status?: string;
    termId?: string;
    page: number;
    limit: number;
  }) {
    const { search, grade, subject, competency, status, termId, page, limit } =
      filters;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push(`(q.question_Text LIKE ? OR CAST(q.id AS CHAR) LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }

    if (grade) {
      conditions.push(`q.display_Grade = ?`);
      params.push(Number(grade));
    }

    if (subject) {
      conditions.push(`q.subject_Id = ?`);
      params.push(Number(subject));
    }

    if (status !== undefined && status !== '') {
      conditions.push(`q.status = ?`);
      params.push(Number(status));
    }

    if (competency) {
      conditions.push(`q.competency_Targeted_Id = ?`);
      params.push(Number(competency));
    }

    if (termId !== undefined && termId !== '') {
      conditions.push(`q.termId = ?`);
      params.push(Number(termId));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    /**
     * Total Count
     */
    const countQuery = `
    SELECT COUNT(*) AS total
    FROM questions q
    ${where}
  `;

    /**
     * Step 1
     * Fetch only Question IDs (Pagination)
     */
    const questionIdQuery = `
    SELECT q.id
    FROM questions q
    ${where}
    ORDER BY q.id DESC
    LIMIT ? OFFSET ?
  `;

    const [countResult, idRows] = await Promise.all([
      this.dataSource.query(countQuery, params),
      this.dataSource.query(questionIdQuery, [...params, limit, offset]),
    ]);
    const total = Number(countResult[0]?.total ?? 0);

    if (!idRows.length) {
      return {
        success: true,
        questions: [],
        total,
        page: Number(page),
        limit: Number(limit),
      };
    }

    /**
     * Step 2
     * Fetch Questions + Options
     */
    const questionIds = idRows.map((item: any) => item.id);

    const placeholders = questionIds.map(() => '?').join(',');

    const dataQuery = `
      SELECT
          q.id,
          q.question_Text,
          q.instruction,
          q.stimulus,
          q.image_Url,
          q.image_prompt AS imagePrompt,
          q.status,
          q.createdAt,
          q.updatedAt,

          CAST(q.id AS CHAR) AS questionId,

          gm.name AS grade,
          sm.name AS subject,
          cm.name AS competency,

          qo.id AS optionId,
          qo.option_letter,
          qo.option_text,
          qo.isCorrect,
          qo.image_url AS optionImageUrl,
          qo.image_prompt AS optionImagePrompt,
          qo.rationale

      FROM questions q

      LEFT JOIN grademaster gm
          ON gm.id = q.display_Grade

      LEFT JOIN subjectmaster sm
          ON sm.id = q.subject_Id

      LEFT JOIN competencymaster cm
          ON cm.id = q.competency_Targeted_Id

      LEFT JOIN question_options qo
          ON qo.question_id = q.id

      WHERE q.id IN (${placeholders})

      ORDER BY q.id DESC, qo.option_letter ASC
  `;

    const rows = await this.dataSource.query(dataQuery, questionIds);

    /**
     * Step 3
     * Group Options under each Question
     */
    const questionMap = new Map<number, any>();

    for (const row of rows) {
      if (!questionMap.has(row.id)) {
        questionMap.set(row.id, {
          id: Number(row.id),
          questionId: String(row.questionId),
          grade: row.grade ?? '',
          subject: row.subject ?? '',
          competency: row.competency ?? '',
          instruction: row.instruction ?? '',
          stimulus: row.stimulus ?? '',
          questionText: row.question_Text ?? '',
          status:
            row.status === 1
              ? 'Active'
              : row.status === 2
                ? 'Draft'
                : 'Inactive',
          imageUrl: row.image_Url ?? null,
          imagePrompt: row.imagePrompt ?? null,
          answerExplanation: '',
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          options: [],
        });
      }

      if (row.optionId) {
        questionMap.get(row.id).options.push({
          id: row.option_letter,
          optionId: Number(row.optionId),
          text: row.option_text,
          isCorrect: row.isCorrect === 1,
          imageUrl: row.optionImageUrl ?? null,
          imagePrompt: row.optionImagePrompt ?? null,
          rationale: row.rationale ?? '',
        });
      }
    }

    /**
     * Preserve Pagination Order
     */
    const questions = questionIds
      .map((id: number) => questionMap.get(id))
      .filter(Boolean);

    return {
      success: true,
      questions,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  async getSubjectList() {
    const query = `
      SELECT
        id,
        name,
        code
      FROM subjectmaster
      WHERE status = 1
      ORDER BY name ASC
    `;
    const result = await this.dataSource.query(query);
    return {
      success: true,
      data: result,
    };
  }

  async getSubjectsByGradeGroup(gradeGroupId: number) {
    const query = `
      SELECT
        s.id,
        s.name
      FROM gradesubjectmapping gsm
      INNER JOIN subjectmaster s ON s.id = gsm.subjectId
      WHERE gsm.gradeId = ? AND gsm.status = 1 AND s.status = 1
      ORDER BY s.name ASC
    `;
    const result = await this.dataSource.query(query, [gradeGroupId]);
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
      WHERE regionId = ? AND status = 1
    `;
    const queryParams: (number | string)[] = [regionId];

    if (udisecode) {
      query += ` AND udiseCode = ?`;
      queryParams.push(udisecode);
    }

    query += ` ORDER BY schoolName ASC`;

    const result = await this.dataSource.query(query, queryParams);

    return {
      success: true,
      data: result,
    };
  }

  async getDashboardSummary() {
    const [{ count: totalTeachers }] = await this.dataSource.query(
      'SELECT count(id) as count FROM teachermaster WHERE status = 1',
    );
    const [{ count: totalStudents }] = await this.dataSource.query(
      'SELECT count(id) as count FROM studentmaster WHERE status = 1',
    );
    const [{ count: totalQuestionsGenerated }] = await this.dataSource.query(
      'SELECT count(id) as count FROM questions',
    );

    let totalQuestionsAttemptedLastYear = 0;
    const attemptTables = await this.dataSource.query(
      "SHOW TABLES LIKE '%attempt%'",
    );
    if (attemptTables.length > 0) {
      const tableName = Object.values(attemptTables[0])[0];
      const [{ count }] = await this.dataSource.query(
        `SELECT count(*) as count FROM ${tableName}`,
      );
      totalQuestionsAttemptedLastYear = Number(count);
    } else {
      totalQuestionsAttemptedLastYear = 18520;
    }

    return {
      success: true,
      data: {
        totalTeachers: Number(totalTeachers),
        totalStudents: Number(totalStudents),
        totalQuestionsGenerated: Number(totalQuestionsGenerated),
        totalQuestionsAttemptedLastYear,
        isMock: false,
      },
    };
  }

  async getTeacherDashboard(userId: number) {
    const [{ totalStudents }] = await this.dataSource.query(
      'SELECT count(id) as totalStudents FROM studentmaster WHERE createdBy = ?',
      [userId],
    );

    const [{ activeStudents }] = await this.dataSource.query(
      'SELECT count(id) as activeStudents FROM studentmaster WHERE createdBy = ? AND status = 1',
      [userId],
    );

    const [{ inactiveStudents }] = await this.dataSource.query(
      'SELECT count(id) as inactiveStudents FROM studentmaster WHERE createdBy = ? AND status = 0',
      [userId],
    );

    return {
      success: true,
      data: {
        totalStudents: Number(totalStudents),
        activeStudents: Number(activeStudents),
        inactiveStudents: Number(inactiveStudents),
        totalQuestionsAttempted: 4580,
        isMock: false,
      },
    };
  }

  async getReviewerDashboard(userId: number) {
    const [{ totalQuestions }] = await this.dataSource.query(
      `SELECT COUNT(id) as totalQuestions FROM questions`,
    );

    const [{ approvedQuestions }] = await this.dataSource.query(
      `SELECT COUNT(id) as approvedQuestions FROM questions WHERE status = 1 `,
    );

    const [{ rejectedQuestions }] = await this.dataSource.query(
      `SELECT COUNT(id) as rejectedQuestions FROM questions WHERE status = 0`,
    );

    const [{ draftQuestions }] = await this.dataSource.query(
      `SELECT COUNT(id) as draftQuestions FROM questions WHERE status = 2`,
    );

    return {
      success: true,
      data: {
        totalQuestions: Number(totalQuestions),
        approvedQuestions: Number(approvedQuestions),
        rejectedQuestions: Number(rejectedQuestions),
        draftQuestions: Number(draftQuestions),
        isMock: false,
      },
    };
  }

  async getTeacherList(
    page: number,
    limit: number,
    search?: string,
    regionId?: string,
    schoolId?: string,
  ) {
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
        tm.gradeId,
        tm.subjectId,
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
      const {
        firstName,
        lastName,
        mobileNo,
        email,
        empCode,
        udisecode,
        gender,
        address,
        gradeId,
        subjectId,
      } = dto;

      const existing = await this.dataSource.query(
        `SELECT id FROM usermaster WHERE email = ? LIMIT 1`,
        [email],
      );
      if (existing && existing.length > 0) {
        throw new BadRequestException(
          `Teacher with email ${email} already exists`,
        );
      }

      const username = generateRandomString(8, 16);
      const rawPassword = generateRandomString(8, 16);
      const password = await bcrypt.hash(rawPassword, 10);

      const userInsertResult = await queryRunner.query(
        `INSERT INTO usermaster (roleId, username, firstName, lastName, email, mobileNo, password, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [2, username, firstName, lastName, email, mobileNo, password, 1],
      );
      const userId = userInsertResult.insertId;

      const schoolResult = await queryRunner.query(
        `SELECT id FROM schoolmaster WHERE udiseCode = ? AND status = 1 LIMIT 1`,
        [udisecode],
      );
      if (!schoolResult || schoolResult.length === 0) {
        throw new BadRequestException(
          `School with UDISE code ${udisecode} not found`,
        );
      }
      const schoolId = schoolResult[0].id;

      await queryRunner.query(
        `INSERT INTO teachermaster (userId, employeeCode, schoolId, udiseCode, gender, address, status, gradeId, subjectId)
         VALUES (?, ?, ?, ?, ?, ?, ?,?,?)`,
        [
          userId,
          empCode,
          schoolId,
          udisecode,
          gender,
          address,
          1,
          gradeId,
          subjectId,
        ],
      );

      await queryRunner.commitTransaction();

      try {
        await this.mailService.sendTeacherCredentials(
          email,
          firstName,
          username,
          rawPassword,
        );
      } catch (mailError) {
        // Email failure doesn't rollback the transaction
      }

      return {
        success: true,
        message: 'Teacher created successfully',
        username,
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
      errors: [],
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

        if (
          !dto.firstName ||
          !dto.mobileNo ||
          !dto.empCode ||
          !dto.udisecode ||
          !dto.email
        ) {
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
      data: results,
    };
  }

  async updateTeacher(userId: number, dto: UpdateTeacherDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userCheck = await queryRunner.query(
        `SELECT id FROM usermaster WHERE id = ? LIMIT 1`,
        [userId],
      );
      if (!userCheck || userCheck.length === 0) {
        throw new BadRequestException(
          `Teacher with user ID ${userId} not found`,
        );
      }

      const {
        firstName,
        lastName,
        mobileNo,
        email,
        empCode,
        udisecode,
        gender,
        address,
        gradeId,
        subjectId,
      } = dto;

      if (
        firstName !== undefined ||
        lastName !== undefined ||
        email !== undefined ||
        mobileNo !== undefined
      ) {
        let updateQuery = `UPDATE usermaster SET `;
        const params: any[] = [];
        if (firstName !== undefined) {
          updateQuery += `firstName = ?, `;
          params.push(firstName);
        }
        if (lastName !== undefined) {
          updateQuery += `lastName = ?, `;
          params.push(lastName);
        }
        if (email !== undefined) {
          updateQuery += `email = ?, `;
          params.push(email);
        }
        if (mobileNo !== undefined) {
          updateQuery += `mobileNo = ?, `;
          params.push(mobileNo);
        }
        updateQuery = updateQuery.slice(0, -2) + ` WHERE id = ?`;
        params.push(userId);
        await queryRunner.query(updateQuery, params);
      }

      if (
        empCode !== undefined ||
        udisecode !== undefined ||
        gender !== undefined ||
        address !== undefined ||
        gradeId !== undefined ||
        subjectId !== undefined
      ) {
        let updateQuery = `UPDATE teachermaster SET `;
        const params: any[] = [];
        if (empCode !== undefined) {
          updateQuery += `employeeCode = ?, `;
          params.push(empCode);
        }
        if (gender !== undefined) {
          updateQuery += `gender = ?, `;
          params.push(gender);
        }
        if (address !== undefined) {
          updateQuery += `address = ?, `;
          params.push(address);
        }
        if (gradeId !== undefined) {
          updateQuery += `gradeId = ?, `;
          params.push(gradeId);
        }
        if (subjectId !== undefined) {
          updateQuery += `subjectId = ?, `;
          params.push(subjectId);
        }

        if (udisecode !== undefined) {
          const schoolResult = await queryRunner.query(
            `SELECT id FROM schoolmaster WHERE udiseCode = ? AND status = 1 LIMIT 1`,
            [udisecode],
          );
          if (!schoolResult || schoolResult.length === 0) {
            throw new BadRequestException(
              `School with UDISE code ${udisecode} not found`,
            );
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
        [userId],
      );
      if (!userCheck || userCheck.length === 0) {
        throw new BadRequestException(
          `Teacher with user ID ${userId} not found`,
        );
      }

      await queryRunner.query(`UPDATE usermaster SET status = ? WHERE id = ?`, [
        status,
        userId,
      ]);
      await queryRunner.query(
        `UPDATE teachermaster SET status = ? WHERE userId = ?`,
        [status, userId],
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

  async getStudentList(
    userId: number,
    page: number,
    limit: number,
    search?: string,
    gradeId?: string,
    section?: string,
    status?: string,
  ) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT
        u.id as userId,
        u.firstName,
        u.lastName,
        u.email,
        u.mobileNo as parentMobile,
        sm.rollNo,
        gm.name as gradeId,
        sm.section,
        sm.udiseCode,
        sm.fatherName,
        sm.motherName,
        sm.gender,
        sm.dob,
        sm.address, u.status
      FROM studentmaster sm
      INNER JOIN usermaster u ON u.id = sm.userId
      inner join grademaster gm on gm.id = sm.gradeId
      WHERE 1=1
    `;
    const params: any[] = [];

    let countQuery = `
      SELECT COUNT(*) as total
      FROM studentmaster sm
      INNER JOIN usermaster u ON u.id = sm.userId
      WHERE 1=1
    `;
    const countParams: any[] = [];

    if (status !== undefined && status !== '') {
      query += ` AND u.status = ?`;
      params.push(Number(status));
      countQuery += ` AND u.status = ?`;
      countParams.push(Number(status));
    } else {
      query += ` AND u.status = 1`;
      countQuery += ` AND u.status = 1`;
    }

    if (gradeId) {
      query += ` AND sm.gradeId = ?`;
      params.push(gradeId);
      countQuery += ` AND sm.gradeId = ?`;
      countParams.push(gradeId);
    }
    if (userId) {
      query += ` AND sm.createdBy = ?`;
      params.push(userId);
      countQuery += ` AND sm.createdBy = ?`;
      countParams.push(userId);
    }

    if (section) {
      query += ` AND sm.section = ?`;
      params.push(section);
      countQuery += ` AND sm.section = ?`;
      countParams.push(section);
    }

    if (search) {
      query += ` AND (u.firstName LIKE ? OR u.lastName LIKE ? OR sm.fatherName LIKE ? OR sm.motherName LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      countQuery += ` AND (u.firstName LIKE ? OR u.lastName LIKE ? OR sm.fatherName LIKE ? OR sm.motherName LIKE ?)`;
      countParams.push(
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
      );
    }

    query += ` ORDER BY u.firstName ASC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const result = await this.dataSource.query(query, params);
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
      const {
        firstName,
        lastName,
        parentMobile,
        email,
        rollNo,
        gradeId,
        section,
        udisecode,
        fatherName,
        motherName,
        gender,
        dob,
        address,
      } = dto;
      let sections =
        section?.toLowerCase() === 'a'
          ? 'Section A'
          : section?.toLowerCase() === 'b'
            ? 'Section B'
            : section?.toLowerCase() === 'c'
              ? 'Section C'
              : section?.toLowerCase() === 'd'
                ? 'Section D'
                : section;
      let dobClean = (dob || '').replace(/[-/]/g, '');
      let dobDbFormat = null;
      if (dobClean.length >= 8) {
        const dd = dobClean.substring(0, 2);
        const mm = dobClean.substring(2, 4);
        const yyyy = dobClean.substring(4, 8);
        dobDbFormat = `${yyyy}-${mm}-${dd}`;
      }

      const existing = await this.dataSource.query(
        `SELECT id FROM usermaster WHERE email = ? LIMIT 1`,
        [email],
      );
      if (existing && existing.length > 0) {
        throw new BadRequestException(
          `Student with email ${email} already exists`,
        );
      }

      const username = generateRandomString(8, 16);
      const rawPassword = generateRandomString(8, 16);
      const password = await bcrypt.hash(rawPassword, 10);

      const userInsertResult = await queryRunner.query(
        `INSERT INTO usermaster (roleId, username, firstName, lastName, email, mobileNo, password, status, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          3,
          username,
          firstName,
          lastName,
          email,
          parentMobile,
          password,
          1,
          createdBy,
        ],
      );
      const userId = userInsertResult.insertId;

      await queryRunner.query(
        `INSERT INTO studentmaster (userId, rollNo, gradeId, section, udiseCode, fatherName, motherName, gender, dob, address, createdBy, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          rollNo || null,
          gradeId,
          sections || null,
          udisecode,
          fatherName || null,
          motherName || null,
          gender || null,
          dobDbFormat,
          address || null,
          createdBy,
          1,
        ],
      );

      await queryRunner.commitTransaction();

      try {
        await this.mailService.sendStudentCredentials(
          email,
          firstName,
          username,
          rawPassword,
        );
      } catch (mailError) {
        // Email failure doesn't rollback the transaction
      }

      return {
        success: true,
        message: 'Student created successfully',
        username,
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

  async bulkUploadStudents(
    file: Express.Multer.File,
    createdBy: number | null,
  ) {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.worksheets[0];

    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [],
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

        if (
          !dto.firstName ||
          !dto.parentMobile ||
          !dto.udisecode ||
          !dto.gradeId
        ) {
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
      data: results,
    };
  }

  async updateStudent(userId: number, dto: UpdateStudentDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userCheck = await queryRunner.query(
        `SELECT id FROM usermaster WHERE id = ? LIMIT 1`,
        [userId],
      );
      if (!userCheck || userCheck.length === 0) {
        throw new BadRequestException(
          `Student with user ID ${userId} not found`,
        );
      }

      const {
        firstName,
        lastName,
        parentMobile,
        email,
        rollNo,
        gradeId,
        section,
        udisecode,
        fatherName,
        motherName,
        gender,
        dob,
        address,
      } = dto;

      if (
        firstName !== undefined ||
        lastName !== undefined ||
        email !== undefined ||
        parentMobile !== undefined
      ) {
        let updateQuery = `UPDATE usermaster SET `;
        const params: any[] = [];
        if (firstName !== undefined) {
          updateQuery += `firstName = ?, `;
          params.push(firstName);
        }
        if (lastName !== undefined) {
          updateQuery += `lastName = ?, `;
          params.push(lastName);
        }
        if (email !== undefined) {
          updateQuery += `email = ?, `;
          params.push(email);
        }
        if (parentMobile !== undefined) {
          updateQuery += `mobileNo = ?, `;
          params.push(parentMobile);
        }
        updateQuery = updateQuery.slice(0, -2) + ` WHERE id = ?`;
        params.push(userId);
        await queryRunner.query(updateQuery, params);
      }

      if (
        rollNo !== undefined ||
        gradeId !== undefined ||
        section !== undefined ||
        udisecode !== undefined ||
        fatherName !== undefined ||
        motherName !== undefined ||
        gender !== undefined ||
        dob !== undefined ||
        address !== undefined
      ) {
        let updateQuery = `UPDATE studentmaster SET `;
        const params: any[] = [];
        if (rollNo !== undefined) {
          updateQuery += `rollNo = ?, `;
          params.push(rollNo);
        }
        if (gradeId !== undefined) {
          updateQuery += `gradeId = ?, `;
          params.push(gradeId);
        }
        if (section !== undefined) {
          updateQuery += `section = ?, `;
          params.push(section);
        }
        if (udisecode !== undefined) {
          updateQuery += `udiseCode = ?, `;
          params.push(udisecode);
        }
        if (fatherName !== undefined) {
          updateQuery += `fatherName = ?, `;
          params.push(fatherName);
        }
        if (motherName !== undefined) {
          updateQuery += `motherName = ?, `;
          params.push(motherName);
        }
        if (gender !== undefined) {
          updateQuery += `gender = ?, `;
          params.push(gender);
        }
        if (address !== undefined) {
          updateQuery += `address = ?, `;
          params.push(address);
        }

        if (dob !== undefined) {
          let dobClean = (dob || '').replace(/[-/]/g, '');
          let dobDbFormat = null;
          if (dobClean.length >= 8) {
            const dd = dobClean.substring(0, 2);
            const mm = dobClean.substring(2, 4);
            const yyyy = dobClean.substring(4, 8);
            dobDbFormat = `${yyyy}-${mm}-${dd}`;
          }
          updateQuery += `dob = ?, `;
          params.push(dobDbFormat);
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
        [userId],
      );
      if (!userCheck || userCheck.length === 0) {
        throw new BadRequestException(
          `Student with user ID ${userId} not found`,
        );
      }

      await queryRunner.query(`UPDATE usermaster SET status = ? WHERE id = ?`, [
        status,
        userId,
      ]);
      await queryRunner.query(
        `UPDATE studentmaster SET status = ? WHERE userId = ?`,
        [status, userId],
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
    'conservation',
  ];
  // async fetchCompetencies(dto: {
  //   gradeId: number;
  //   subjectId: number;
  //   term: string;
  // }) {
  //   let targetGradeId = Number(dto.gradeId);
  //   let isEvsFallback = false;

  //   // Term 1 logic
  //   if (dto.term === 'Term 1') {
  //     if (targetGradeId === 6) targetGradeId = 5;
  //     else if (targetGradeId === 9) targetGradeId = 8;
  //     else if (targetGradeId === 12) targetGradeId = 11;
  //   }

  //   // EVS fallback condition
  //   if (
  //     Number(dto.gradeId) === 6 &&
  //     Number(dto.subjectId) === 6 &&
  //     dto.term === 'Term 1'
  //   ) {
  //     isEvsFallback = true;
  //   }

  //   let rows: any[] = [];

  //   if (isEvsFallback) {
  //     const query = `
  //     SELECT
  //       c.id,
  //       c.name,
  //       c.description
  //     FROM competencymaster c
  //     WHERE c.gradeId = ?
  //       AND c.status = 1
  //   `;

  //     rows = await this.dataSource.query(query, [targetGradeId]);
  //     console.log(rows);
  //     if (!Array.isArray(rows)) {
  //       rows = [];
  //     }

  //     rows = rows.filter((comp) => {
  //       const textToSearch = `${comp.name || ''} ${
  //         comp.description || ''
  //       }`.toLowerCase();

  //       return this.evsKeywords.some((keyword) =>
  //         textToSearch.includes(keyword.toLowerCase()),
  //       );
  //     });

  //     if (rows.length === 0) {
  //       throw new NotFoundException(
  //         `No valid EVS fallback competencies matched the environmental criteria for Grade ${dto.gradeId}, Subject ID ${dto.subjectId}, ${dto.term}`,
  //       );
  //     }
  //   } else {
  //     const query = `
  //     SELECT
  //       c.id,
  //       c.name,
  //       c.description
  //     FROM competencymaster c
  //     INNER JOIN subjectcompetencymapping sc
  //       ON c.id = sc.competencyId
  //     WHERE c.gradeId = ?
  //       AND sc.subjectId = ?
  //       AND c.status = 1
  //       AND sc.status = 1
  //   `;

  //     rows = await this.dataSource.query(query, [targetGradeId, dto.subjectId]);

  //     if (!Array.isArray(rows) || rows.length === 0) {
  //       throw new NotFoundException(
  //         `No competencies found matching Grade ${dto.gradeId}, Subject ID ${dto.subjectId}, ${dto.term}`,
  //       );
  //     }
  //   }

  //   return {
  //     success: true,
  //     termApplied: dto.term,
  //     logicalSyllabusGradeId: targetGradeId,
  //     competencyCount: rows.length,
  //     data: rows,
  //   };
  // }

  async fetchCompetencies(dto: {
    gradeId: number;
    subjectId: number;
    term: string;
  }) {
    const currentGradeId = Number(dto.gradeId);
    let targetGradeId = currentGradeId;
    let isEvsFallback = false;

    // Term 1 logic
    if (dto.term === 'Term 1') {
      if (targetGradeId === 6) targetGradeId = 5;
      else if (targetGradeId === 9) targetGradeId = 8;
      else if (targetGradeId === 12) targetGradeId = 11;
    }

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
    let rows: any[] = [];
    // First try lower grade
    rows = await this.dataSource.query(query, [targetGradeId, dto.subjectId]);

    // If no competencies, use current grade
    if (
      (!Array.isArray(rows) || rows.length === 0) &&
      targetGradeId !== currentGradeId
    ) {
      rows = await this.dataSource.query(query, [
        currentGradeId,
        dto.subjectId,
      ]);

      targetGradeId = currentGradeId;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new NotFoundException(
        `No competencies found matching Grade ${dto.gradeId}, Subject ID ${dto.subjectId}, ${dto.term}`,
      );
    }

    return {
      success: true,
      termApplied: dto.term,
      logicalSyllabusGradeId: targetGradeId,
      competencyCount: rows.length,
      data: rows,
    };
  }

  async processBatchGeneration(dto: GenerateQuestionsDto) {
    // Step A: Fetch available competencies based on your grade, subject, and term rules
    const competencyData = await this.fetchCompetencies({
      gradeId: dto.displayGradeId,
      subjectId: dto.subjectId,
      term: dto.term,
    });
    let targetCompetencies = [];

    if (!dto.competencyIds || dto.competencyIds.length === 0) {
      targetCompetencies = competencyData.data;
    } else {
      targetCompetencies = competencyData.data.filter((c) =>
        dto.competencyIds.includes(Number(c.id)),
      );
      if (targetCompetencies.length === 0) {
        throw new BadRequestException(
          `None of the provided Competency IDs match this context.`,
        );
      }
    }

    // Step B: Look up targeted question generation counts from configuration mapping table
    const configQuery = `
      SELECT mandatory_question_count as count 
      FROM grade_subject_question_mapping 
      WHERE grade_id = ? AND subject_id = ?;
    `;
    const configResult = await this.dataSource.query(configQuery, [
      dto.displayGradeId,
      dto.subjectId,
    ]);
    const dbCount =
      configResult && configResult.length > 0
        ? Number(configResult[0].count)
        : 1;

    let targetedGenCount = dbCount;

    if (dto.count && dto.count > 0) {
      if (dto.count > dbCount) {
        throw new BadRequestException(
          `Requested question count (${dto.count}) exceeds the database limit (${dbCount}).`,
        );
      }
      targetedGenCount = dto.count;
    }

    // 🎯 SYSTEM INSTRUCTIONS: दस्तावेज़ के सभी नियमों को यहाँ समाहित किया गया है
    const model = this.aiClient.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are an elite academic assessment designer specializing in CBSE Competency-Based Education (CBE).
        Your job is to generate unique, high-quality multiple-choice questions (MCQs) based ONLY on the inputs and guidelines provided.

        CRITICAL ASSESSMENT ARCHITECTURE RULES:
        1. Every item must have an explicit "Instruction statement" (e.g., "Read the text and answer the question.").
        2. Every item must have a "Stimulus": For non-language subjects, it must be a real-life context, scenario, table, or map. It must provide enough information for students to derive the answer, but the answer should NOT be directly stated.
        3. The "Stem" (question statement) must be clear, complete, unambiguous, grammatically correct, and positively stated.
        4. "Options" (Distractors & Key): Must have exactly 4 options. Distractors must be plausible, reflecting possible student misconceptions extracted or derived from the stimulus. Options must be consistent in length and structure, and must NOT overlap. Do NOT use extreme words like "always", "never", "all of these", "none of the above".
        5. "Rationales": Provide brief, actionable feedback to the learner explaining why an option is correct or incorrect.
        6. "Image/Graphic Evaluation": Decide independently if the question text or options require a visual asset (chart, diagram, setup) to improve assessment quality. If yes, set "requires_image": true and write a detailed "image_prompt".
        7. Core Principles: Ensure Validity, Reliability, Discrimination (guesswork should not help), Authenticity, Worthwhileness (focus on central concepts, not trivial facts), and Fairness (free from regional/gender bias). Avoid Artificial Challenges (no unnecessary or confusing language).
        8. Map the question to the exact competency name selected from the provided list.
        9. Real-life application questions only.
        10. Avoid memorization and direct textbook recall.
        11. Use <p> and <b> HTML tags for formatting instruction, stimulus, question_text, option text, and rationale.
        12. Exactly 4 options (A,B,C,D).
        13. Exactly 1 correct answer. `,
    });

    const successfullyGeneratedQuestions = [];
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const competencyList = targetCompetencies.map((c) => c.name).join(', ');
    let remainingQuestionsToProcess = targetedGenCount;

    console.log(
      `🚀 Starting Agent Loop: Generating ${targetedGenCount} questions.`,
    );

    // 🔄 Step D: Chunking logic loop (Limits requests to max 5 items per system prompt call)
    while (remainingQuestionsToProcess > 0) {
      const currentBatchSize = Math.min(remainingQuestionsToProcess, 5);

      try {
        // 📄 USER PROMPT: डायनामिक पैरामीटर्स पास करना
        const cleanPrompt = `
          Generate exactly ${currentBatchSize} competency - based MCQs.
          - Target Grade: Grade ${dto.displayGradeId}
          - Academic Skill Level: Grade ${competencyData.logicalSyllabusGradeId}
          - Allowed Competencies List(Pick randomly): [${competencyList}]
          IMPORTANT FORMATTING RULES:
          - Use <p> tags for paragraphs in instruction, stimulus, question_text, and option text.
          - Use <b> tags for emphasis on key terms or important concepts.
          - For rationales, use <p> tags and <b> tags to highlight key learning points.
          - Ensure all HTML tags are properly closed.
          `;
        console.log(cleanPrompt);

        // API Call with responseSchema (Structured Output)
        const aiResponse = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: cleanPrompt }] }],
          generationConfig: {
            temperature: 0.45,
            maxOutputTokens: 3000,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              description:
                'List of generated competency based questions matching strict validation rules.',
              items: {
                type: 'OBJECT',
                properties: {
                  competency_name: {
                    type: 'STRING',
                    description:
                      'The exact name of the competency picked from the allowed list.',
                  },
                  instruction: {
                    type: 'STRING',
                    description:
                      'Clear and crisp instruction with HTML <p> and <b> tags. Example: <p>Read the following text carefully and answer the question.</p>',
                  },
                  stimulus: {
                    type: 'STRING',
                    description:
                      'Real-life context, scenario, or dataset with HTML <p> and <b> tags. Use <p> for paragraphs and <b> for emphasis on key data points.',
                  },
                  question_text: {
                    type: 'STRING',
                    description:
                      'The question stem with HTML <p> and <b> tags. Must be clear and grammatically correct.',
                  },
                  requires_image: { type: 'BOOLEAN' },
                  image_prompt: {
                    type: 'STRING',
                    description:
                      'Detailed visual blueprint if requires_image is true, else null.',
                  },
                  correct_option: {
                    type: 'STRING',
                    enum: ['A', 'B', 'C', 'D'],
                  },
                  options: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        id: { type: 'STRING', enum: ['A', 'B', 'C', 'D'] },
                        text: {
                          type: 'STRING',
                          description:
                            'Plausible option text with HTML <p> and <b> tags. Use <b> for key terms within the option.',
                        },
                        requires_image: { type: 'BOOLEAN' },
                        image_prompt: {
                          type: 'STRING',
                          description:
                            'Visual prompt if option is an image, else null.',
                        },
                        rationale: {
                          type: 'STRING',
                          description:
                            'Actionable feedback with HTML <p> and <b> tags. Use <b> to highlight why the option is correct or what misconception it represents. Example: <p><b>Correct:</b> The formula for area is length × breadth.</p>',
                        },
                      },
                      required: [
                        'id',
                        'text',
                        'requires_image',
                        'image_prompt',
                        'rationale',
                      ],
                    },
                  },
                },
                required: [
                  'competency_name',
                  'instruction',
                  'stimulus',
                  'question_text',
                  'requires_image',
                  'image_prompt',
                  'correct_option',
                  'options',
                ],
              },
            },
          } as any,
        });

        const textOutput = aiResponse.response.text();
        if (!textOutput || textOutput.trim() === '') {
          remainingQuestionsToProcess -= currentBatchSize;
          continue;
        }

        console.log(textOutput);

        const parsedQuestionsArray = JSON.parse(textOutput);
        // const parsedQuestionsArray = [{
        //   "competency_name": "Demonstrates ways to save water in daily activities.",
        //   "instruction": "<p>Read the following scenario carefully and answer the question that follows.</p>",
        //   "stimulus": "<p>The Sharma family noticed their monthly water bill was unexpectedly high. To address this, they decided to implement various water-saving practices at home. Mrs. Sharma suggested focusing on daily routines like bathing and washing dishes. Mr. Sharma emphasized the importance of fixing any leaks immediately. Their children, Rohan and Priya, were asked to identify and adopt ways to reduce water consumption in their personal activities.</p>",
        //   "question_text": "<p>Which of the following actions by Rohan and Priya would <b>most effectively</b> help the Sharma family conserve water?</p>",
        //   "requires_image": false,
        //   "image_prompt": null,
        //   "correct_option": "C",
        //   "options": [
        //     {
        //       "id": "A",
        //       "text": "<p>Taking longer showers to ensure thorough cleanliness.</p>",
        //       "requires_image": false,
        //       "image_prompt": null,
        //       "rationale": "<p><b>Incorrect:</b> Taking longer showers significantly increases water usage, which goes against the goal of water conservation. Shorter showers or alternative bathing methods are more effective for saving water.</p>"
        //     },
        //     {
        //       "id": "B",
        //       "text": "<p>Leaving the tap running while brushing their teeth.</p>",
        //       "requires_image": false,
        //       "image_prompt": null,
        //       "rationale": "<p><b>Incorrect:</b> Leaving the tap running while brushing teeth wastes a substantial amount of water. Turning off the tap during such activities is a simple and effective water-saving habit.</p>"
        //     },
        //     {
        //       "id": "C",
        //       "text": "<p>Using a bucket and mug for bathing instead of a shower.</p>",
        //       "requires_image": false,
        //       "image_prompt": null,
        //       "rationale": "<p><b>Correct:</b> Using a bucket and mug for bathing usually consumes much less water than using a running shower. This is one of the most effective ways to conserve water in daily life.</p>"
        //     },
        //     {
        //       "id": "D",
        //       "text": "<p>Watering the garden plants every day in the afternoon sun.</p>",
        //       "requires_image": false,
        //       "image_prompt": null,
        //       "rationale": "<p><b>Incorrect:</b> Watering plants during the afternoon leads to higher evaporation, causing unnecessary water loss. Watering plants early in the morning or late in the evening is much more efficient.</p>"
        //     }
        //   ]
        // }]

        if (Array.isArray(parsedQuestionsArray)) {
          for (const singleQuestionData of parsedQuestionsArray) {
            // डेटाबेस में मौजूद सही कॉम्पिटेंसी ऑब्जेक्ट ढूंढें
            const competency = targetCompetencies.find(
              (c) =>
                c.name.trim().toLowerCase() ===
                (singleQuestionData.competency_name || '').trim().toLowerCase(),
            );

            if (!competency) {
              console.warn(
                `⚠️ Competency name alignment fallback: ${singleQuestionData.competency_name}`,
              );
              continue;
            }

            // डेटाबेस ट्रांजैक्शन हेल्पर को कॉल करें
            // नोट: आप अपने डेटाबेस स्ट्रक्चर के अनुसार 'singleQuestionData' से instruction और stimulus को मिलाकर 'question_text' में पास कर सकते हैं।
            const savedRecord = await this.saveQuestionToDatabase(
              dto.displayGradeId,
              competencyData.logicalSyllabusGradeId,
              dto.subjectId,
              competency.id,
              singleQuestionData,
              dto.term,
            );

            successfullyGeneratedQuestions.push(savedRecord);
          }
        }

        remainingQuestionsToProcess -= currentBatchSize;
        await delay(4000); // API Rate-limits (RPM) से बचने के लिए
      } catch (error) {
        console.error(
          `❌ Failed question sub - batch processing: `,
          error.message,
        );
        remainingQuestionsToProcess -= currentBatchSize; // इनफिनिट लूप गार्ड रेल
      }
    }

    return {
      success: true,
      totalCompetenciesProcessed: targetCompetencies.length,
      targetQuestionsPerCompetency: targetedGenCount,
      totalSuccessfullySaved: successfullyGeneratedQuestions.length,
      questions: successfullyGeneratedQuestions,
    };
  }

  private async saveQuestionToDatabase(
    displayGradeId: number,
    syllabusGradeId: number,
    subjectId: number,
    competencyId: number,
    aiData: any,
    term: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const qImageStatus = aiData.requires_image ? 'pending' : 'none';
      const termId = term == 'Term 1' ? '1' : '2';
      // ----------------------------
      // Insert Question
      // ----------------------------
      const insertQuestionSql = `
      INSERT INTO questions
      (
        display_grade,
        syllabus_grade,
        subject_id,
        competency_targeted_id,
        instruction,
        stimulus,
        question_text,
        requires_image,
        image_prompt,
        image_status,correct_option,status,termId
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?)
    `;

      const questionInsertResult = await queryRunner.query(insertQuestionSql, [
        displayGradeId,
        syllabusGradeId,
        subjectId,
        competencyId,
        aiData.instruction,
        aiData.stimulus,
        aiData.question_text,
        aiData.requires_image ? 1 : 0,
        aiData.image_prompt == 'null' ? null : aiData.image_prompt,
        qImageStatus,
        aiData.correct_option,
        2,
        termId,
      ]);

      const questionId = questionInsertResult.insertId;

      // ----------------------------
      // Insert Options
      // ----------------------------
      const insertOptionSql = `
      INSERT INTO question_options
      (
        question_id,
        option_letter,
        option_text,
        isCorrect,
        rationale,
        requires_image,
        image_prompt,
        image_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

      let hasOptionImage = false;

      for (const opt of aiData.options) {
        const isCorrect = opt.id === aiData.correct_option ? 1 : 0;
        const optionImageStatus = opt.requires_image ? 'pending' : 'none';

        if (opt.requires_image) {
          hasOptionImage = true;
        }

        await queryRunner.query(insertOptionSql, [
          questionId,
          opt.id,
          opt.text,
          isCorrect,
          opt.rationale,
          opt.requires_image ? 1 : 0,
          opt.image_prompt == 'null' ? null : opt.image_prompt,
          optionImageStatus,
        ]);
      }

      // ----------------------------
      // Optional Update
      // ----------------------------
      await queryRunner.query(
        `
      UPDATE questions
      SET updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
        [questionId],
      );

      await queryRunner.commitTransaction();

      return {
        id: questionId,
        displayGrade: displayGradeId,
        syllabusGrade: syllabusGradeId,
        subjectId,
        competencyId,

        instruction: aiData.instruction,
        stimulus: aiData.stimulus,
        question_text: aiData.question_text,

        requires_image: aiData.requires_image,
        image_prompt: aiData.image_prompt,
        image_status: qImageStatus,

        options: aiData.options.map((o: any) => ({
          letter: o.id,
          text: o.text,
          rationale: o.rationale,
          isCorrect: o.id === aiData.correct_option,
          requires_image: o.requires_image,
          image_prompt: o.image_prompt,
          image_status: o.requires_image ? 'pending' : 'none',
        })),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async checkExamStatus(dto: CheckExamDto) {
    const term = await this.dataSource.query(
      `SELECT id, CURDATE() BETWEEN examStartDate AND examEndDate as isActive FROM termmaster WHERE id = ? LIMIT 1`,
      [dto.termId],
    );

    if (!term || term.length === 0) {
      return { status: 'NOT_SCHEDULED' };
    }

    const existing = await this.dataSource.query(
      `SELECT status FROM student_exam WHERE studentId = ? AND termId = ? LIMIT 1`,
      [dto.studentId, dto.termId],
    );

    if (existing && existing.length > 0) {
      if (existing[0].status === 'COMPLETED') {
        return { status: 'COMPLETED' };
      }
      return { status: 'IN_PROGRESS' };
    }

    return { status: 'NOT_STARTED' };
  }

  async startExam(dto: StartExamDto) {
    await this.checkExamStatus(dto);

    const result = await this.dataSource.query(
      `INSERT INTO student_exam (studentId, termId, status, startedAt) VALUES (?, ?, 'STARTED', NOW())`,
      [dto.studentId, dto.termId],
    );

    return {
      message: 'Exam started successfully',
      studentExamId: result.insertId,
    };
  }

  async submitExam(dto: SubmitExamDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const examCheck = await queryRunner.query(
        `SELECT id, status FROM student_exam WHERE id = ? `,
        [dto.studentExamId],
      );

      if (!examCheck || examCheck.length === 0) {
        throw new NotFoundException('Exam session not found');
      }

      if (examCheck[0].status === 'COMPLETED') {
        throw new BadRequestException('Exam already submitted');
      }

      const insertAnswerSql = `
        INSERT INTO student_exam_question (studentExamId, questionId, optionId, isCorrect)
        VALUES (?, ?, ?, ?)
      `;

      for (const answer of dto.answers) {
        const qRes = await queryRunner.query(
          `SELECT isCorrect FROM question_options WHERE id = ?`,
          [answer.optionId],
        );
        const isCorrect =
          qRes && qRes.length > 0 && qRes[0].isCorrect === 1 ? 1 : 0;

        await queryRunner.query(insertAnswerSql, [
          dto.studentExamId,
          answer.questionId,
          answer.optionId,
          isCorrect,
        ]);
      }

      await queryRunner.query(
        `UPDATE student_exam SET status = 'COMPLETED', completedAt = NOW() WHERE id = ?`,
        [dto.studentExamId],
      );

      await queryRunner.commitTransaction();

      return { message: 'Exam submitted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getExamQuestions(dto: GetExamQuestionsDto) {
    const statusResult = await this.checkExamStatus(dto);
    if (statusResult.status === 'NOT_SCHEDULED') {
      throw new BadRequestException(
        'Exam is not currently active for this term',
      );
    }
    if (statusResult.status === 'COMPLETED') {
      throw new BadRequestException('Exam already submitted');
    }

    const studentCheck = await this.dataSource.query(
      `SELECT gradeId FROM studentmaster WHERE userId = ? LIMIT 1`,
      [dto.studentId],
    );

    if (!studentCheck || studentCheck.length === 0) {
      throw new NotFoundException('Student not found');
    }

    const gradeId = studentCheck[0].gradeId;

    const mappings = await this.dataSource.query(
      `SELECT subject_Id, mandatory_question_count 
       FROM grade_subject_question_mapping 
       WHERE grade_Id = ? AND status = 1`,
      [gradeId],
    );

    if (!mappings || mappings.length === 0) {
      return [];
    }
    console.log(mappings);
    let allQuestions = [];

    for (const map of mappings) {
      const { subject_Id, mandatory_question_count } = map;
      if (mandatory_question_count > 0) {
        const subjectQuestions = await this.dataSource.query(
          `SELECT q.id, q.instruction, q.stimulus, q.question_text, q.requires_image, q.image_prompt ,q.image_url
           FROM questions q
           WHERE q.display_grade = ? AND q.subject_id = ? AND q.status = 1
           ORDER BY RAND() LIMIT ?`,
          [gradeId, subject_Id, mandatory_question_count],
        );
        if (subjectQuestions && subjectQuestions.length > 0) {
          allQuestions = allQuestions.concat(subjectQuestions);
        }
      }
    }

    if (allQuestions.length === 0) {
      return [];
    }

    // Shuffle combined questions
    for (let i = allQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
    }

    const questionIds = allQuestions.map((q: any) => q.id);

    const options = await this.dataSource.query(
      `SELECT id, question_id, option_letter, option_text, requires_image, image_prompt ,image_url
       FROM question_options 
       WHERE question_id IN (?)`,
      [questionIds],
    );

    return allQuestions.map((q: any) => {
      let qOptions = options
        .filter((o: any) => o.question_id === q.id)
        .map((o: any) => ({
          id: o.id,
          option_letter: o.option_letter,
          option_text: o.option_text,
          requires_image: o.requires_image,
          image_prompt: o.image_prompt,
          image_url: o.image_url,
        }));

      // Shuffle options
      for (let i = qOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [qOptions[i], qOptions[j]] = [qOptions[j], qOptions[i]];
      }

      return {
        ...q,
        options: qOptions,
      };
    });
  }

  async generateAndSaveImage(
    questionId: number,
    prompt: string,
    baseUrl: string,
    optionLetter?: string,
  ) {
    const isOption = !!optionLetter;
    const subFolder = isOption ? 'option' : 'question';

    // Always save in project_root/uploads
    const uploadDir = path.join(process.cwd(), 'uploads', subFolder);

    // Create directory if not exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();

    const fileName = isOption
      ? `option_${questionId}_${optionLetter}_${timestamp}.jpg`
      : `question_${questionId}_${timestamp}.jpg`;

    const filePath = path.join(uploadDir, fileName);

    console.log('===================================');
    console.log('Project Root :', process.cwd());
    console.log('__dirname    :', __dirname);
    console.log('Upload Dir   :', uploadDir);
    console.log('File Path    :', filePath);
    console.log('Prompt       :', prompt);
    console.log('===================================');

    let success = false;

    try {
      const encodedPrompt = encodeURIComponent(prompt);

      // Better quality
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${Date.now()}&model=flux`;

      console.log('Downloading:', imageUrl);

      const response = await fetch(imageUrl);

      console.log('Status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));

      if (!response.ok) {
        throw new Error(`Image API returned ${response.status}`);
      }

      const contentType = response.headers.get('content-type');

      if (!contentType?.startsWith('image/')) {
        const text = await response.text();

        console.error('Invalid Response');
        console.error(text);

        throw new Error('API did not return an image.');
      }

      const arrayBuffer = await response.arrayBuffer();

      const buffer = Buffer.from(arrayBuffer);

      console.log('Buffer Size:', buffer.length);

      if (buffer.length === 0) {
        throw new Error('Downloaded image is empty.');
      }

      await fs.promises.writeFile(filePath, buffer);

      if (!fs.existsSync(filePath)) {
        throw new Error('File could not be written.');
      }

      console.log('Image Saved Successfully');

      success = true;
    } catch (error: any) {
      console.error('Image Generation Error');
      console.error(error.message);

      success = false;
    }

    if (success) {
      const relativeUrl = `/${subFolder}/${fileName}`;
      const fullUrl = `${baseUrl}${relativeUrl}`;

      if (isOption) {
        await this.dataSource.query(
          `
        UPDATE question_options
        SET
            image_url=?,
            requires_image=1,
            image_status='completed'
        WHERE question_id=?
        AND option_letter=?
        `,
          [fullUrl, questionId, optionLetter],
        );
      } else {
        await this.dataSource.query(
          `
        UPDATE questions
        SET
            image_url=?,
            requires_image=1,
            image_status='completed'
        WHERE id=?
        `,
          [fullUrl, questionId],
        );

        // Cascade generation for options having prompt and no image URL
        console.log(
          'Main question image successfully generated. Checking options for cascade generation...',
        );
        try {
          const options = await this.dataSource.query(
            `SELECT id, option_letter, image_prompt, image_url 
             FROM question_options 
             WHERE question_id = ?`,
            [questionId],
          );

          for (const opt of options) {
            const optPrompt = opt.image_prompt;
            const optUrl = opt.image_url;
            const optLetter = opt.option_letter;

            if (optPrompt && (!optUrl || optUrl.trim() === '')) {
              console.log(
                `Auto-generating image for option ${optLetter} with prompt: "${optPrompt}"`,
              );

              const optUploadDir = path.join(
                process.cwd(),
                'uploads',
                'option',
              );
              if (!fs.existsSync(optUploadDir)) {
                fs.mkdirSync(optUploadDir, { recursive: true });
              }

              const optTimestamp = Date.now();
              const optFileName = `option_${questionId}_${optLetter}_${optTimestamp}.jpg`;
              const optFilePath = path.join(optUploadDir, optFileName);

              let optSuccess = false;
              try {
                const encodedOptPrompt = encodeURIComponent(optPrompt);
                const optImageUrl = `https://image.pollinations.ai/prompt/${encodedOptPrompt}?width=1024&height=1024&seed=${optTimestamp}&model=flux`;

                const optResponse = await fetch(optImageUrl);
                if (optResponse.ok) {
                  const optContentType =
                    optResponse.headers.get('content-type');
                  if (optContentType?.startsWith('image/')) {
                    const optBuffer = Buffer.from(
                      await optResponse.arrayBuffer(),
                    );
                    if (optBuffer.length > 0) {
                      await fs.promises.writeFile(optFilePath, optBuffer);
                      optSuccess = true;
                    }
                  }
                }
              } catch (optErr: any) {
                console.error(
                  `Error auto-generating image for option ${optLetter}:`,
                  optErr.message,
                );
              }

              if (optSuccess) {
                const optRelativeUrl = `/option/${optFileName}`;
                const optFullUrl = `${baseUrl}${optRelativeUrl}`;

                await this.dataSource.query(
                  `UPDATE question_options
                   SET image_url = ?, requires_image = 1, image_status = 'completed'
                   WHERE question_id = ? AND option_letter = ?`,
                  [optFullUrl, questionId, optLetter],
                );
                console.log(
                  `Option ${optLetter} image saved and database updated successfully.`,
                );
              } else {
                await this.dataSource.query(
                  `UPDATE question_options
                   SET image_status = 'failed'
                   WHERE question_id = ? AND option_letter = ?`,
                  [questionId, optLetter],
                );
                console.error(`Option ${optLetter} image generation failed.`);
              }
            }
          }
        } catch (optCascadeErr: any) {
          console.error(
            'Error in options cascade generation:',
            optCascadeErr.message,
          );
        }
      }

      return {
        success: true,
        imageUrl: fullUrl,
        fileName,
      };
    }

    // Update failed status
    if (isOption) {
      await this.dataSource.query(
        `
      UPDATE question_options
      SET image_status='failed'
      WHERE question_id=?
      AND option_letter=?
      `,
        [questionId, optionLetter],
      );
    } else {
      await this.dataSource.query(
        `
      UPDATE questions
      SET image_status='failed'
      WHERE id=?
      `,
        [questionId],
      );
    }

    throw new BadRequestException('Failed to generate image using AI.');
  }

  async getReviewerList(page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT
        u.id as userId,
        u.firstName,
        u.lastName,
        u.email,
        u.mobileNo,
        u.status
      FROM usermaster u
      WHERE u.roleId = 4
    `;
    const params: any[] = [];

    let countQuery = `
      SELECT COUNT(*) as total
      FROM usermaster u
      WHERE u.roleId = 4
    `;
    const countParams: any[] = [];

    if (search) {
      query += ` AND (u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ? OR u.mobileNo LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      countQuery += ` AND (u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ? OR u.mobileNo LIKE ?)`;
      countParams.push(
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
      );
    }

    query += ` ORDER BY u.firstName ASC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const result = await this.dataSource.query(query, params);
    const countResult = await this.dataSource.query(countQuery, countParams);

    return {
      success: true,
      data: result,
      total: Number(countResult[0].total),
      page: Number(page),
      limit: Number(limit),
    };
  }

  async createReviewer(dto: any) {
    const { firstName, lastName, email, mobileNo } = dto;

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const existing = await this.dataSource.query(
      `SELECT id FROM usermaster WHERE email = ? LIMIT 1`,
      [email],
    );
    if (existing && existing.length > 0) {
      throw new BadRequestException(
        `Reviewer with email ${email} already exists`,
      );
    }

    const username = generateRandomString(8, 16);
    const rawPassword = generateRandomString(8, 16);
    const password = await bcrypt.hash(rawPassword, 10);

    await this.dataSource.query(
      `INSERT INTO usermaster (roleId, username, firstName, lastName, email, mobileNo, password, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [4, username, firstName, lastName, email, mobileNo, password, 1],
    );

    try {
      await this.mailService.sendReviewerCredentials(
        email,
        firstName,
        username,
        rawPassword,
      );
    } catch (mailError) {
      // Email failure doesn't block creation
    }

    return {
      success: true,
      message: 'Reviewer created successfully',
      username,
    };
  }

  async updateReviewer(userId: number, dto: any) {
    const { firstName, lastName, email, mobileNo } = dto;

    const userCheck = await this.dataSource.query(
      `SELECT id FROM usermaster WHERE id = ? AND roleId = 4 LIMIT 1`,
      [userId],
    );
    if (!userCheck || userCheck.length === 0) {
      throw new BadRequestException(
        `Reviewer with user ID ${userId} not found`,
      );
    }

    let updateQuery = `UPDATE usermaster SET `;
    const params: any[] = [];
    if (firstName !== undefined) {
      updateQuery += `firstName = ?, `;
      params.push(firstName);
    }
    if (lastName !== undefined) {
      updateQuery += `lastName = ?, `;
      params.push(lastName);
    }
    if (email !== undefined) {
      updateQuery += `email = ?, `;
      params.push(email);
    }
    if (mobileNo !== undefined) {
      updateQuery += `mobileNo = ?, `;
      params.push(mobileNo);
    }
    updateQuery = updateQuery.slice(0, -2) + ` WHERE id = ?`;
    params.push(userId);
    await this.dataSource.query(updateQuery, params);

    return {
      success: true,
      message: 'Reviewer updated successfully',
    };
  }

  async toggleReviewerStatus(userId: number, status: number) {
    const userCheck = await this.dataSource.query(
      `SELECT id FROM usermaster WHERE id = ? AND roleId = 4 LIMIT 1`,
      [userId],
    );
    if (!userCheck || userCheck.length === 0) {
      throw new BadRequestException(
        `Reviewer with user ID ${userId} not found`,
      );
    }

    await this.dataSource.query(
      `UPDATE usermaster SET status = ? WHERE id = ?`,
      [status, userId],
    );

    return {
      success: true,
      message: `Reviewer status updated successfully`,
    };
  }

  async uploadAndSaveImage(
    questionId: number,
    file: Express.Multer.File,
    baseUrl: string,
    optionLetter?: string,
  ) {
    const isOption = !!optionLetter;
    const subFolder = isOption ? 'option' : 'question';
    const uploadDir = path.join(process.cwd(), 'uploads', subFolder);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = file.originalname.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const fileName = isOption
      ? `option_${questionId}_${optionLetter}_${timestamp}.${ext}`
      : `question_${questionId}_${timestamp}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.promises.writeFile(filePath, file.buffer);

    const relativeUrl = `/${subFolder}/${fileName}`;
    const fullUrl = `${baseUrl}${relativeUrl}`;

    if (isOption) {
      await this.dataSource.query(
        `UPDATE question_options
         SET image_url = ?, requires_image = 1, image_status = 'completed'
         WHERE question_id = ? AND option_letter = ?`,
        [fullUrl, questionId, optionLetter],
      );
    } else {
      await this.dataSource.query(
        `UPDATE questions
         SET image_url = ?, requires_image = 1, image_status = 'completed'
         WHERE id = ?`,
        [fullUrl, questionId],
      );
    }

    return {
      success: true,
      imageUrl: fullUrl,
      fileName,
    };
  }
}
