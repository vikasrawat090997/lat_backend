import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MarketingExecutiveLead } from './entities/marketing-executive-lead.entity';
import { CreateMarketingExecutiveLeadDto } from './dto/create-marketing-executive-lead.dto';
import { LeadStatus } from '../../utils/enums';
import { leadsMatrix, leadsTimeLine } from 'src/utils/rawQueries';
import { GetLeadsQueryDto } from '../admin/dto/all-leads.dto';

@Injectable()
export class MarketingExecutiveService {
  constructor(
    @InjectRepository(MarketingExecutiveLead)
    private leadRepository: Repository<MarketingExecutiveLead>,
    private readonly dataSource: DataSource,
  ) {}

  async createLead(
    createDto: CreateMarketingExecutiveLeadDto,
    files: {
      aadharCardFront?: Express.Multer.File[];
      electricityBill?: Express.Multer.File[];
      customer?: Express.Multer.File[];
      aadharCardBack?: Express.Multer.File[];
      cancelCheque?: Express.Multer.File[];
    },
    userId: string,
  ) {
    try {
      const { fullName, phoneNumber, address } = createDto;

      const documentsToSave = [];

      if (files?.aadharCardFront?.length) {
        documentsToSave.push({
          documentTypeId: '1', // Aadhar Front
          documentUrl: files.aadharCardFront[0].path.replace(/\\/g, '/'),
          originalName: files.aadharCardFront[0].originalname,
        });
      }

      if (files?.electricityBill?.length) {
        documentsToSave.push({
          documentTypeId: '2', // Electricity Bill
          documentUrl: files.electricityBill[0].path.replace(/\\/g, '/'),
          originalName: files.electricityBill[0].originalname,
        });
      }

      if (files?.customer?.length) {
        documentsToSave.push({
          documentTypeId: '3', // Customer Photograph
          documentUrl: files.customer[0].path.replace(/\\/g, '/'),
          originalName: files.customer[0].originalname,
        });
      }

      if (files?.aadharCardBack?.length) {
        documentsToSave.push({
          documentTypeId: '4', // Aadhar Back
          documentUrl: files.aadharCardBack[0].path.replace(/\\/g, '/'),
          originalName: files.aadharCardBack[0].originalname,
        });
      }

      if (files?.cancelCheque?.length) {
        documentsToSave.push({
          documentTypeId: '5', // Cancel Cheque
          documentUrl: files.cancelCheque[0].path.replace(/\\/g, '/'),
          originalName: files.cancelCheque[0].originalname,
        });
      }

      const lead = this.leadRepository.create({
        fullName,
        phoneNumber,
        address,
        userId,
        status: LeadStatus.QUERY_SENT,
        documents: documentsToSave,
        events: [
          {
            eventName: 'Query Sent',
            userId,
            description: 'Lead submitted successfully',
          },
        ],
      });

      return await this.leadRepository.save(lead);
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async getLeadsWithMetricsAndDocs(
    userId: number,
    query: GetLeadsQueryDto,
  ): Promise<any[]> {
    try {
      const { search, status } = query;

      let leadsMatrixQuery = leadsMatrix(userId);

      // Filter: Status Dropdown
      if (status) {
        leadsMatrixQuery += ` AND mel.status = '${status}'`;
      }

      // Filter: Global Search
      if (search?.trim()) {
        const searchKeyword = search.trim();

        leadsMatrixQuery += `
        AND (
          mel.fullName LIKE '%${searchKeyword}%'
          OR mel.phoneNumber LIKE '%${searchKeyword}%'
          OR CAST(mel.id AS CHAR) LIKE '%${searchKeyword}%'
        )
      `;
      }

      const rawResults = await this.dataSource.query(leadsMatrixQuery);

      return this.formatLeadData(rawResults);
    } catch (err: any) {
      if (err.status) throw err;

      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  private formatLeadData(rawRows) {
    const grouped = rawRows.reduce((acc, row) => {
      const id = row.leadId;

      // If this lead isn't in our accumulator yet, create its base structure
      if (!acc[id]) {
        const dealAmount = Number(row.totalDealAmount || 0);
        const receivedAmount = Number(row.totalReceived || 0);

        acc[id] = {
          leadId: row.leadId,
          leadName: row.leadName,
          address: row.address, //House address
          phone: row.phoneNumber,
          totalDealAmount: dealAmount,
          totalReceived: receivedAmount,
          // Fixes the SQL subtraction anomaly dynamically:
          totalPendingAmount: dealAmount - receivedAmount,
          paymentsCount: Number(row.paymentsCount || 0),
          collectionPercentage: Number(row.collectionPercentage || 0),
          leadStatus: row.leadStatus,
          siteVisitorName: row.siteVisitorName,
          installerName: row.installerName,
          createdAt: row.createdAt,
          documents: [], // The nested array where your unique document rows will collect
        };
      }

      // Push the unique document details into this lead's array slot
      acc[id].documents.push({
        documentTypeId: row.documentTypeId,
        documentName: row.documentName,
        uploadStatus: row.uploadStatus,
      });

      return acc;
    }, {});

    // Convert the map back into a clean array of grouped objects
    return Object.values(grouped).sort((a: any, b: any) => b.leadId - a.leadId);
  }

  async getLeadTimeline(leadId: number): Promise<any[]> {
    try {
      const timeline = await this.dataSource.query(leadsTimeLine(leadId));
      return timeline;
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }

  async getGroupedGallery(leadId: number): Promise<any> {
    try {
      // Image Base URL
      const fileUrlPrefix = process.env.FILE_BASE_URL || '';
      // const rawFiles = await this.dataSource.query(
      //   `
      //   SELECT
      //       medm.id AS documentMappingId,
      //       dtm.id AS documentTypeId,
      //       dtm.typeName AS documentName,
      //       dtm.description AS description,
      //       medm.documentUrl AS fileUrl,
      //       CASE
      //           WHEN dtm.type = 'Document' THEN 'documents'
      //           WHEN dtm.type = 'Roof' THEN 'roofPhotos'
      //           WHEN dtm.type = 'Installment' THEN 'installProof'
      //           ELSE 'documents'
      //       END AS tabCategory
      //   FROM documenttypemaster dtm
      //   -- Using INNER JOIN or keeping LEFT JOIN but filtering in JS
      //   LEFT JOIN marketingexecutivedocumentmapping medm
      //       ON medm.documentTypeId = dtm.id AND medm.leadId = ?
      //   ORDER BY dtm.id ASC;
      //   `,
      //   [leadId],
      // );

      // Base layout initialized with explicit empty arrays
      const rawFiles = await this.dataSource.query(
        ` SELECT 
      medm.id AS documentMappingId,
      dtm.id AS documentTypeId,
      dtm.typeName AS documentName,
      dtm.description AS description,
      -- Safely concatenate the environment variable parameter if a file URL exists
      IF(medm.documentUrl IS NOT NULL, CONCAT(?, medm.documentUrl), NULL) AS fileUrl,
      CASE 
          WHEN dtm.type = 'Document' THEN 'documents'
          WHEN dtm.type = 'Roof' THEN 'roofPhotos'
          WHEN dtm.type = 'Installment' THEN 'installProof'
          ELSE 'documents'
      END AS tabCategory
  FROM documenttypemaster dtm
  LEFT JOIN marketingexecutivedocumentmapping medm 
      ON medm.documentTypeId = dtm.id AND medm.leadId = ?
  ORDER BY dtm.id ASC;
  `,
        [fileUrlPrefix, leadId], // Pass fileUrlPrefix as the 1st parameter (?) and leadId as the 2nd (?)
      );

      const gallery = {
        totalFilesCount: 0,
        counts: {
          documents: 0,
          roofPhotos: 0,
          installProof: 0,
        },
        tabs: {
          documents: [], // Fallback is implicitly a blank array
          roofPhotos: [], // Fallback is implicitly a blank array
          installProof: [], // Fallback is implicitly a blank array
        },
      };

      for (const file of rawFiles) {
        const category = file.tabCategory;

        // CRITICAL CHANGE: Only push to array and process if the file has been uploaded
        if (file.documentMappingId) {
          const formattedFile = {
            documentMappingId: file.documentMappingId,
            documentTypeId: file.documentTypeId,
            documentName: file.documentName,
            documentSubtext: file.description || '',
            fileUrl: file.fileUrl,
          };

          gallery.tabs[category].push(formattedFile);

          // Increment tracking metrics
          gallery.counts[category]++;
          gallery.totalFilesCount++;
        }
      }

      return gallery;
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to assemble uploaded document components',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUserDashboardMetrics(userId: number) {
    try {
      // We use a clean QueryBuilder to run conditional aggregation in one database trip
      const rawMetrics = await this.leadRepository
        .createQueryBuilder('lead')
        .select('COUNT(lead.id)', 'totalLeads')
        .addSelect(
          `SUM(CASE WHEN lead.status = :approved THEN 1 ELSE 0 END)`,
          'approvedCount',
        )
        .addSelect(
          `SUM(CASE WHEN lead.status = :rejected THEN 1 ELSE 0 END)`,
          'rejectedCount',
        )
        .addSelect(
          `SUM(CASE WHEN lead.status = :underReview THEN 1 ELSE 0 END)`,
          'pendingReviewCount',
        )
        .addSelect(
          `SUM(CASE WHEN lead.status = :installed THEN 1 ELSE 0 END)`,
          'installationsCount',
        )
        .addSelect(
          `SUM(CASE WHEN lead.status = :paymentDone THEN 1 ELSE 0 END)`,
          'commissionEligibleCount',
        )
        .where('lead.userId = :userId', { userId })
        .setParameters({
          approved: LeadStatus.APPROVED,
          rejected: LeadStatus.REJECTED,
          underReview: LeadStatus.UNDER_REVIEW,
          installed: LeadStatus.INSTALLATION_COMPLETED,
          paymentDone: LeadStatus.PAYMENT_COMPLETED,
        })
        .getRawOne();

      // MySQL returns COUNT and SUM values as raw strings, so parse them cleanly into integers
      return {
        totalLeads: parseInt(rawMetrics.totalLeads || '0', 10),
        approved: parseInt(rawMetrics.approvedCount || '0', 10),
        rejected: parseInt(rawMetrics.rejectedCount || '0', 10),
        pendingReview: parseInt(rawMetrics.pendingReviewCount || '0', 10),
        installations: parseInt(rawMetrics.installationsCount || '0', 10),
        commissionEligible: parseInt(
          rawMetrics.commissionEligibleCount || '0',
          10,
        ),
      };
    } catch (err: any) {
      if (err.status) throw err;
      throw new HttpException(err.message || err, HttpStatus.BAD_REQUEST);
    }
  }
}
