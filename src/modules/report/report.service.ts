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
        c.name as name,
        MAX(s.name) as subject,
        IFNULL(ROUND(AVG(seq.isCorrect) * 100, 2), 0) as avgScore,
        COUNT(DISTINCT q.id) as questionCount,
        COUNT(DISTINCT seq.studentExamId) as studentsEvaluated,
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
        sm.name as name,
        IFNULL(ROUND(AVG(seq.isCorrect) * 100, 2), 0) as avgScore,
        IFNULL(ROUND(COUNT(DISTINCT se.studentId) / NULLIF((SELECT COUNT(*) FROM studentmaster), 0) * 100, 1), 0) as participation,
        COUNT(DISTINCT se.studentId) as studentsAttempted,
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
      WHERE gm.id NOT IN (1,2,3) AND gm.status = 1
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

  async getTeacherReport(filters: ReportFilterDto) {
    const query = `
      SELECT 
        tm.id,
        CONCAT(u.firstName, ' ', u.lastName) as name,
        MAX(sm.schoolName) as schoolName,
        IFNULL(ROUND(AVG(seq.isCorrect) * 100, 2), 0) as avgScore,
        COUNT(DISTINCT se.studentId) as studentsEvaluated,
        IFNULL(ROUND(SUM(CASE WHEN se.status = 'COMPLETED' THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT se.id), 0) * 100, 1), 0) as completionPct,
        'Active' as status
      FROM teachermaster tm
      LEFT JOIN usermaster u ON u.id = tm.userId
      LEFT JOIN schoolmaster sm ON sm.id = tm.schoolId
      LEFT JOIN studentmaster stu ON stu.createdBy = tm.userId
      LEFT JOIN student_exam se ON se.studentId = stu.id
      LEFT JOIN student_exam_question seq ON seq.studentExamId = se.id
      WHERE tm.status = 1
      GROUP BY tm.id
    `;
    const result = await this.dataSource.query(query);
    return {
      success: true,
      data: result,
      total: result.length,
    };
  }

  async getStudentReport(filters: ReportFilterDto) {
    const query = `
      SELECT 
        stu.id,
        CONCAT(u.firstName, ' ', u.lastName) as name,
        MAX(gm.name) as grade,
        IFNULL(ROUND(AVG(seq.isCorrect) * 100, 2), 0) as avgScore,
        COUNT(DISTINCT se.id) as examsTaken,
        IFNULL(ROUND(AVG(seq.isCorrect) * 100, 2), 0) as accuracy,
        'Active' as status
      FROM studentmaster stu
      LEFT JOIN usermaster u ON u.id = stu.userId
      LEFT JOIN grademaster gm ON gm.id = stu.gradeId
      LEFT JOIN student_exam se ON se.studentId = stu.id
      LEFT JOIN student_exam_question seq ON seq.studentExamId = se.id
      WHERE stu.status = 1
      GROUP BY stu.id
    `;
    const result = await this.dataSource.query(query);
    return {
      success: true,
      data: result,
      total: result.length,
    };
  }

  async getTermReport(filters: ReportFilterDto) {
    const query = `
      SELECT 
        t.id,
        t.name as name,
        IFNULL(ROUND(AVG(seq.isCorrect) * 100, 2), 0) as avgScore,
        COUNT(DISTINCT se.id) as totalExams,
        COUNT(DISTINCT se.studentId) as participation,
        IFNULL(ROUND(SUM(CASE WHEN se.status = 'COMPLETED' THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT se.id), 0) * 100, 1), 0) as completionPct
      FROM termmaster t
      LEFT JOIN student_exam se ON se.termId = t.id
      LEFT JOIN student_exam_question seq ON seq.studentExamId = se.id
      WHERE t.status = 1
      GROUP BY t.id
    `;
    const result = await this.dataSource.query(query);
    return {
      success: true,
      data: result,
      total: result.length,
    };
  }

  async getKvsReportData(filters: ReportFilterDto) {
    const [regionsRes, gradesRes, competenciesRes, subjectsRes] = await Promise.all([
      this.getRegionReport(filters),
      this.getGradeReport(filters),
      this.getCompetencyReport(filters),
      this.getSubjectReport(filters)
    ]);

    const totalsResult = await this.dataSource.query(`
      SELECT 
        (SELECT COUNT(*) FROM regionmaster WHERE status = 1) as regions,
        (SELECT COUNT(*) FROM schoolmaster WHERE status = 1) as schools,
        (SELECT COUNT(*) FROM studentmaster WHERE status = 1) as students,
        (SELECT COUNT(*) FROM student_exam) as assessments
    `);

    // Map 'avgScore' to 'score' for the template
    const regions = (regionsRes.data || []).map((r: any) => ({
      ...r,
      score: r.avgScore || 0
    }));

    let nationalAvg = 0;
    let topRegion = { name: 'N/A', score: 0 };
    
    if (regions.length > 0) {
      const totalScore = regions.reduce((sum: number, r: any) => sum + Number(r.score), 0);
      nationalAvg = Number((totalScore / regions.length).toFixed(2));
      topRegion = regions.reduce((max: any, r: any) => (Number(r.score) > Number(max.score) ? r : max), regions[0]);
    }

    // Keep all grades returned by the query since getGradeReport already filters grademaster.
    // The user complained about 1-12, but if they are in grademaster, they are in the DB.
    // However, if they want grades that have *students* (not necessarily exams):
    // We can't filter by studentsEvaluated > 0 if there are no exams in the DB!
    const grades = gradesRes.data || [];
    const competencies = competenciesRes.data || [];
    const subjects = subjectsRes.data || [];

    return {
      totals: totalsResult[0] || { regions: 0, schools: 0, students: 0, assessments: 0 },
      regions,
      grades,
      competencies,
      subjects,
      nationalAvg,
      topRegion
    };
  }

  async generatePdf(filters: ReportFilterDto): Promise<Buffer> {
    const puppeteer = require('puppeteer');
    const handlebars = require('handlebars');
    const fs = require('fs');
    const path = require('path');

    // 1. Get real data
    const data = await this.getKvsReportData(filters);
    const currentYear = new Date().getFullYear();

    // 2. Load and compile template
    const templatePath = path.join(process.cwd(), 'src', 'modules', 'report', 'report-template.hbs');
    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateHtml);

    // 3. Inject data
    const html = template({
      year: currentYear.toString(),
      ...data
    });

    // 4. Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    });

    await browser.close();
    
    return Buffer.from(pdfBuffer);
  }
}
