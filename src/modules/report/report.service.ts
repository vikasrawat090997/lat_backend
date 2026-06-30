import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReportFilterDto } from './dto/report-filters.dto';

@Injectable()
export class ReportService {
  constructor(private readonly dataSource: DataSource) {}

  private getWhereClause(filters: ReportFilterDto, alias: string = '') {
    const conditions = [];
    const params = [];
    const prefix = alias ? `${alias}.` : '';

    // E.g. ${prefix}regionId = ?
    if (filters.regionId) {
      conditions.push(`${prefix}regionId = ?`);
      params.push(filters.regionId);
    }
    if (filters.schoolId) {
      conditions.push(`${prefix}id = ?`); // depends on context, simplified here
      params.push(filters.schoolId);
    }
    
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { where, params };
  }

  async getCompetencyReport(filters: ReportFilterDto) {
    const query = `
      SELECT 
        c.id, 
        c.name as competency,
        MAX(s.name) as subject,
        IFNULL(ROUND(AVG(seq.isCorrect) * 100, 2), 0) as avgScore,
        COUNT(DISTINCT q.id) as questionCount,
        COUNT(seq.id) as attemptCount,
        IFNULL(ROUND(AVG(seq.isCorrect) * 100, 2), 0) as accuracy,
        'Active' as status
      FROM competencymaster c
      LEFT JOIN subjectcompetencymapping scm ON scm.competencyId = c.id
      LEFT JOIN subjectmaster s ON scm.subjectId = s.id
      LEFT JOIN questions q ON q.competency_targeted_id = c.id
      LEFT JOIN student_exam_question seq ON seq.questionId = q.id
      WHERE c.status = 1
      GROUP BY c.id
    `;
    const result = await this.dataSource.query(query);
    return {
      success: true,
      data: result,
      total: result.length,
    };
  }

  async getSchoolReport(filters: ReportFilterDto) {
    const query = `
      SELECT 
        sm.id,
        sm.schoolName as name,
        MAX(r.name) as region,
        IFNULL(ROUND(AVG(seq.isCorrect) * 100, 2), 0) as avgScore,
        IFNULL(ROUND(COUNT(DISTINCT CASE WHEN se.status = 'COMPLETED' THEN se.id END) / NULLIF(COUNT(DISTINCT se.id), 0) * 100, 1), 0) as completion,
        COUNT(DISTINCT stu.id) as totalStudents,
        'Active' as status
      FROM schoolmaster sm
      LEFT JOIN regionmaster r ON sm.regionId = r.id
      LEFT JOIN teachermaster tm ON tm.schoolId = sm.id
      LEFT JOIN studentmaster stu ON stu.createdBy = tm.userId
      LEFT JOIN student_exam se ON se.studentId = stu.id
      LEFT JOIN student_exam_question seq ON seq.studentExamId = se.id
      WHERE sm.status = 1
      GROUP BY sm.id
    `;
    const result = await this.dataSource.query(query);
    return {
      success: true,
      data: result,
      total: result.length,
    };
  }

  async getRegionReport(filters: ReportFilterDto) {
    const query = `
      SELECT 
        rm.id,
        rm.name as region,
        IFNULL(ROUND(AVG(seq.isCorrect) * 100, 2), 0) as avgScore,
        IFNULL(ROUND(COUNT(DISTINCT se.studentId) / NULLIF(COUNT(DISTINCT stu.id), 0) * 100, 1), 0) as participation,
        IFNULL(ROUND(COUNT(DISTINCT CASE WHEN se.status = 'COMPLETED' THEN se.id END) / NULLIF(COUNT(DISTINCT se.id), 0) * 100, 1), 0) as completion,
        COUNT(DISTINCT se.studentId) as studentsAttempted,
        COUNT(DISTINCT CASE WHEN se.id IS NOT NULL THEN sm.id END) as activeSchools
      FROM regionmaster rm
      LEFT JOIN schoolmaster sm ON sm.regionId = rm.id
      LEFT JOIN teachermaster tm ON tm.schoolId = sm.id
      LEFT JOIN studentmaster stu ON stu.createdBy = tm.userId
      LEFT JOIN student_exam se ON se.studentId = stu.id
      LEFT JOIN student_exam_question seq ON seq.studentExamId = se.id
      WHERE rm.status = 1
      GROUP BY rm.id
    `;
    const result = await this.dataSource.query(query);
    return {
      success: true,
      data: result,
      total: result.length,
    };
  }

  async getSubjectReport(filters: ReportFilterDto) {
    const query = `
      SELECT 
        sm.id,
        sm.name as subject,
        IFNULL(ROUND(AVG(seq.isCorrect) * 100, 2), 0) as avgScore,
        IFNULL(ROUND(COUNT(DISTINCT se.studentId) / NULLIF((SELECT COUNT(*) FROM studentmaster), 0) * 100, 1), 0) as participation,
        IFNULL(ROUND(AVG(seq.isCorrect) * 100, 2), 0) as accuracy,
        '-' as timeTaken,
        '-' as mostDifficult,
        '-' as mostSuccessful
      FROM subjectmaster sm
      LEFT JOIN student_exam se ON se.subjectId = sm.id
      LEFT JOIN student_exam_question seq ON seq.studentExamId = se.id
      WHERE sm.status = 1
      GROUP BY sm.id
    `;
    const result = await this.dataSource.query(query);
    return {
      success: true,
      data: result,
      total: result.length,
    };
  }

  async getGradeReport(filters: ReportFilterDto) {
    const query = `
      SELECT 
        gm.id,
        gm.name as grade,
        IFNULL(ROUND(AVG(seq.isCorrect) * 100, 2), 0) as avgScore,
        COUNT(DISTINCT se.studentId) as studentsEvaluated,
        COUNT(DISTINCT CASE WHEN se.status = 'COMPLETED' THEN se.id END) as completed,
        COUNT(DISTINCT CASE WHEN se.status = 'STARTED' THEN se.id END) as pending,
        IFNULL(ROUND(AVG(seq.isCorrect) * 100, 2), 0) as accuracy,
        '-' as weakestCompetency,
        '-' as strongestCompetency
      FROM grademaster gm
      LEFT JOIN studentmaster stu ON stu.gradeId = gm.id
      LEFT JOIN student_exam se ON se.studentId = stu.id
      LEFT JOIN student_exam_question seq ON seq.studentExamId = se.id
      WHERE gm.id NOT IN (1,2,3)
      GROUP BY gm.id
      ORDER BY gm.id ASC
    `;
    const result = await this.dataSource.query(query);
    return {
      success: true,
      data: result,
      total: result.length,
    };
  }
}
