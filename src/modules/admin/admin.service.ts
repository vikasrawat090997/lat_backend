import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MarketingExecutiveLead } from '../marketing-executive/entities/marketing-executive-lead.entity';
import { DataSource, Repository } from 'typeorm';
import { GetLeadsQueryDto } from './dto/all-leads.dto';
import { RejectLeadDto } from './dto/reject-lead.dto';
import { LeadStatus } from 'src/utils/enums';
import * as fs from 'fs'; // Import Node's filesystem module to delete files
import { AssignSiteVisitorDto } from './dto/assign-site-vistor.dto';
import { SetDealAmountDto } from './dto/set-deal-amount.dto';
import { AddPaymentDto } from './dto/add-payment.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(MarketingExecutiveLead)
    private readonly leadsRepository: Repository<MarketingExecutiveLead>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Fetches data matching search inputs and dropdown selections for the main data table
   */
  async getAllLeads(query: GetLeadsQueryDto) {
    try {
      const { search, status } = query;

      const queryBuilder = this.leadsRepository.createQueryBuilder('mel');

      // Select columns, applying the CASE WHEN block for "Assigned To" logic
      queryBuilder.select([
        'mel.id AS id',
        'mel.fullName AS customerName',
        'mel.address AS address',
        'mel.phoneNumber AS phoneNumber',
        'mel.status AS status',
        'mel.createdAt AS createdAt',
        'um_exec.fullName AS marketingExecutiveName',
        `CASE 
          WHEN mel.siteVisitorUserId IS NULL THEN NULL
          WHEN le.userId IS NOT NULL THEN um_worker.fullName
          ELSE um_visitor.fullName
         END AS currentWorkerName`,
      ]);

      // Join 1: The original marketing executive creator
      queryBuilder.innerJoin(
        'usermaster',
        'um_exec',
        'um_exec.id = mel.userId',
      );

      // Join 2: The assigned site visitor fallback target
      queryBuilder.leftJoin(
        'usermaster',
        'um_visitor',
        'um_visitor.id = mel.siteVisitorUserId',
      );

      // Join 3: Subquery to target the single newest event timeline row ID
      queryBuilder.leftJoin(
        (subQuery) => {
          return subQuery
            .select('sub_le.leadId', 'leadId')
            .addSelect('MAX(sub_le.id)', 'latest_event_id')
            .from('leadevent', 'sub_le')
            .groupBy('sub_le.leadId');
        },
        'latest_evt',
        'latest_evt.leadId = mel.id',
      );

      // Join 4: Pull metadata from that latest isolated event row
      queryBuilder.leftJoin(
        'leadevent',
        'le',
        'le.id = latest_evt.latest_event_id',
      );

      // Join 5: The user assigned to that specific latest timeline action event
      queryBuilder.leftJoin(
        'usermaster',
        'um_worker',
        'um_worker.id = le.userId',
      );

      // Filter: Status Dropdown
      if (status) {
        queryBuilder.andWhere('mel.status = :status', { status });
      }

      // Filter: Global Input Text Search Box
      if (search && search.trim() !== '') {
        const searchKeyword = `%${search.trim()}%`;
        queryBuilder.andWhere(
          `(mel.fullName LIKE :searchKeyword OR 
            mel.phoneNumber LIKE :searchKeyword OR 
            CAST(mel.id AS CHAR) LIKE :searchKeyword)`,
          { searchKeyword },
        );
      }

      queryBuilder.orderBy('mel.createdAt', 'DESC');

      const rawData = await queryBuilder.getRawMany();

      // Formulate payload arrays to match the UI row columns perfectly
      return {
        totalLeads: rawData.length,
        data: rawData.map((item) => {
          const year = item.createdAt
            ? new Date(item.createdAt).getFullYear()
            : 2026;

          return {
            leadIdString: `SJ-${year}-${String(item.id).padStart(3, '0')}`,
            customer: item.customerName,
            address: item.address,
            contact: item.phoneNumber,
            marketingExec: item.marketingExecutiveName,
            status: item.status,
            // Displays the name if an event or visitor exists, otherwise returns the empty UI dash '—'
            assignedTo: item.currentWorkerName || '—',
          };
        }),
      };
    } catch (err: any) {
      throw new HttpException(
        err.message || 'Failed to parse conditional workflow list mapping',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getLeadDetailsForModal(leadId: number) {
    try {
      // 1. Fetch the primary lead profile information along with assigned user names
      const leadInfo = await this.leadsRepository
        .createQueryBuilder('mel')
        .select([
          'mel.id AS id',
          'mel.fullName AS customerName',
          'mel.phoneNumber AS phone',
          'mel.address AS address',
          'mel.status AS status',
          'mel.createdAt AS createdAt',
          'um_exec.fullName AS marketingExecName',
          'um_visitor.fullName AS siteVisitorName',
          'um_installer.fullName AS installerName',
        ])
        .innerJoin('usermaster', 'um_exec', 'um_exec.id = mel.userId')
        .leftJoin(
          'usermaster',
          'um_visitor',
          'um_visitor.id = mel.siteVisitorUserId',
        )
        .leftJoin(
          'usermaster',
          'um_installer',
          'um_installer.id = mel.installerUserId',
        )
        .where('mel.id = :leadId', { leadId })
        .getRawOne();

      if (!leadInfo) {
        throw new NotFoundException(`Lead with ID ${leadId} not found`);
      }

      // 2. Query the 'leadevent' table to get the complete history log for the Activity Timeline section
      const timelineEvents = await this.leadsRepository.manager
        .createQueryBuilder()
        .select([
          'le.eventName AS eventName',
          'le.description AS description',
          'le.createdAt AS createdAt',
          'um.fullName AS workerName',
        ])
        .from('leadevent', 'le')
        .leftJoin('usermaster', 'um', 'um.id = le.userId')
        .where('le.leadId = :leadId', { leadId })
        .orderBy('le.createdAt', 'DESC')
        .getRawMany();

      // =========================================================================
      // 3. DYNAMIC QUERY: Pull uploaded files from marketingexecutivedocumentmapping
      // =========================================================================
      const uploadedDocuments = await this.leadsRepository.manager
        .createQueryBuilder()
        .select([
          'doc.id AS id',
          'doc.documentTypeId AS documentTypeId',
          'doc.documentUrl AS documentUrl',
          'doc.originalName AS originalName',
        ])
        .from('marketingexecutivedocumentmapping', 'doc')
        .where('doc.leadId = :leadId', { leadId })
        .getRawMany();

      // 4. Format the Custom Lead ID string structure (e.g., SJ-2026-016)
      const year = leadInfo.createdAt
        ? new Date(leadInfo.createdAt).getFullYear()
        : 2026;
      const leadIdString = `SJ-${year}-${String(leadInfo.id).padStart(3, '0')}`;

      // 5. Return the fully structured dataset to map your modal UI fields dynamically
      return {
        id: leadInfo.id,
        leadIdString: leadIdString,
        customerName: leadInfo.customerName,
        phone: leadInfo.phone,
        status: leadInfo.status,
        address: leadInfo.address,
        marketingExec: leadInfo.marketingExecName || '—',
        siteVisitor: leadInfo.siteVisitorName || '—',
        installer: leadInfo.installerName || '—',

        // Dynamic document chip files pulled straight from your mapping table records
        documents: uploadedDocuments.map((doc) => ({
          id: doc.id,
          documentTypeId: doc.documentTypeId,
          url: doc.documentUrl,
          name: doc.originalName, // e.g., "Aadhar.pdf", "Electricity_Bill.jpg"
        })),

        // Timeline array mapping
        activityTimeline: timelineEvents.map((event) => ({
          title: event.eventName,
          byUser: event.workerName || 'System',
          description: event.description,
          timestamp: event.createdAt,
        })),
      };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err.message ||
          'Failed to assemble modal dataset views with real documents',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async rejectLeadTransaction(
    dto: RejectLeadDto,
    currentUserId: number,
    localFileName?: string,
  ) {
    try {
      const { leadId, remarks } = dto;

      return await this.dataSource.manager.transaction(
        async (transactionalEntityManager) => {
          // 1. Confirm the target record is valid
          const lead = await transactionalEntityManager.findOne(
            MarketingExecutiveLead,
            {
              where: { id: leadId.toString() },
            },
          );

          if (!lead) {
            throw new NotFoundException(
              `Lead with ID ${leadId} does not exist`,
            );
          }

          // 2. Perform the update inside 'marketingexecutiveleads' table switching status to 'Rejected'
          await transactionalEntityManager.update(
            MarketingExecutiveLead,
            { id: leadId },
            { status: LeadStatus.REJECTED },
          );

          // 4. Insert timeline history log directly into your exact 'leadevent' table structure layout
          await transactionalEntityManager.query(
            `INSERT INTO leadevent (leadId, eventName, userId, description, status, createdBy,fileUrl) 
         VALUES (?, ?, ?, ?, ?, ?,?)`,
            [
              leadId,
              LeadStatus.REJECTED,
              currentUserId,
              remarks,
              1,
              currentUserId,
              `uploads/marketingExecutive/${localFileName}`,
            ],
          );

          return {
            success: true,
            message:
              'Lead status updated to Rejected, voice record saved to local path folder directory locations.',
            fileReference: localFileName
              ? `uploads/marketingExecutive/${localFileName}`
              : null,
          };
        },
      );
    } catch (error: any) {
      // =========================================================================
      // CRITICAL FILE CLEANUP WORKFLOW
      // If the database fails, we catch the error here and delete the orphan file
      // =========================================================================
      if (localFileName) {
        const absolutePath = `./uploads/marketingExecutive/${localFileName}`;

        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath); // Permanently delete the uploaded audio file from disk
          console.log(
            `[Database Error - File Deleted]: Cleaned up orphan file at ${absolutePath}`,
          );
        }
      }

      // Pass the original error back up to the controller so it alerts the user
      throw new HttpException(
        error.message || 'Transaction failed, changes rolled back.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processLeadApprove(
    dto: RejectLeadDto,
    currentUserId: number,
    localFileName?: string,
  ) {
    try {
      const { leadId, remarks } = dto;

      return await this.dataSource.manager.transaction(
        async (transactionalEntityManager) => {
          // 1. Confirm the target record is valid
          const lead = await transactionalEntityManager.findOne(
            MarketingExecutiveLead,
            {
              where: { id: leadId.toString() },
            },
          );

          if (!lead) {
            throw new NotFoundException(
              `Lead with ID ${leadId} does not exist`,
            );
          }

          // 2. Perform the update inside 'marketingexecutiveleads' table switching status to 'Rejected'
          await transactionalEntityManager.update(
            MarketingExecutiveLead,
            { id: leadId },
            { status: LeadStatus.APPROVED },
          );

          // 4. Insert timeline history log directly into your exact 'leadevent' table structure layout
          await transactionalEntityManager.query(
            `INSERT INTO leadevent (leadId, eventName, userId, description, status, createdBy,fileUrl) 
         VALUES (?, ?, ?, ?, ?, ?,?)`,
            [
              leadId,
              LeadStatus.APPROVED,
              currentUserId,
              remarks,
              1,
              currentUserId,
              `uploads/marketingExecutive/${localFileName}`,
            ],
          );

          return {
            success: true,
            message: 'Lead status updated to Approved',
            fileReference: localFileName
              ? `uploads/marketingExecutive/${localFileName}`
              : null,
          };
        },
      );
    } catch (error: any) {
      // =========================================================================
      // CRITICAL FILE CLEANUP WORKFLOW
      // If the database fails, we catch the error here and delete the orphan file
      // =========================================================================
      if (localFileName) {
        const absolutePath = `./uploads/marketingExecutive/${localFileName}`;

        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath); // Permanently delete the uploaded audio file from disk
          console.log(
            `[Database Error - File Deleted]: Cleaned up orphan file at ${absolutePath}`,
          );
        }
      }

      // Pass the original error back up to the controller so it alerts the user
      throw new HttpException(
        error.message || 'Transaction failed, changes rolled back.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAvailableSiteVisitors() {
    try {
      // Direct raw query or repository lookup on usermaster
      const visitors = await this.dataSource.manager.query(
        `SELECT id, fullName, email 
         FROM usermaster 
         WHERE roleId = 3 AND status = 1`, // Assuming 3 = Site Visitor role, 1 = Active
      );

      return {
        success: true,
        data: visitors.map((v) => ({
          id: Number(v.id),
          fullName: v.fullName,
          email: v.email,
        })),
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to fetch site visitors',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * API 2: Transactional database method to assign the site visitor
   */
  async assignSiteVisitorTransaction(
    dto: AssignSiteVisitorDto,
    currentUserId: number,
  ) {
    const { leadId, siteVisitorUserId, notes } = dto;

    return await this.dataSource.manager.transaction(
      async (transactionalEntityManager) => {
        // 1. Confirm the target lead exists
        const lead = await transactionalEntityManager.findOne(
          MarketingExecutiveLead,
          {
            where: { id: leadId.toString() },
          },
        );

        if (!lead) {
          throw new NotFoundException(`Lead with ID ${leadId} does not exist`);
        }

        // 2. Fetch the Visitor's name to use in the history timeline log description
        const visitorUser = await transactionalEntityManager.query(
          `SELECT fullName FROM usermaster WHERE id = ?`,
          [siteVisitorUserId],
        );

        if (!visitorUser || visitorUser.length === 0) {
          throw new NotFoundException(
            `Site Visitor with ID ${siteVisitorUserId} not found`,
          );
        }
        const visitorName = visitorUser.fullName;

        // 3. Update the assignment columns and pipeline status on the lead
        await transactionalEntityManager.update(
          MarketingExecutiveLead,
          { id: leadId },
          {
            siteVisitorUserId: siteVisitorUserId.toString(),
            status: LeadStatus.ASSIGNED_TO_SITE_VISITOR, // Updates core lead status tracking
          },
        );

        // 4. Construct description timeline text including any optional instructions typed into the modal
        let eventDescription = `Lead assigned to Site Visitor: ${visitorName}.`;
        if (notes && notes.trim() !== '') {
          eventDescription += ` | Notes: ${notes.trim()}`;
        }

        // 5. Append this action event permanently into the 'leadevent' table history
        await transactionalEntityManager.query(
          `INSERT INTO leadevent (leadId, eventName, userId, description, status, createdBy) 
         VALUES (?, ?, ?, ?, ?, ?)`,
          [
            leadId,
            LeadStatus.ASSIGNED_TO_SITE_VISITOR, // eventName tracking match
            siteVisitorUserId, // Target worker handling this event stage now
            eventDescription,
            1,
            currentUserId, // Authenticated user performing the assignment
          ],
        );

        return {
          success: true,
          message: `Lead successfully assigned to ${visitorName}. Timeline event logged.`,
        };
      },
    );
  }

  async setDealAmountTransaction(dto: SetDealAmountDto, currentUserId: number) {
    const { leadId, dealAmount } = dto;

    return await this.dataSource.manager.transaction(
      async (transactionalEntityManager) => {
        // 1. Verify the lead exists in your system
        const lead = await transactionalEntityManager.findOne(
          MarketingExecutiveLead,
          {
            where: { id: leadId.toString() },
          },
        );

        if (!lead) {
          throw new NotFoundException(`Lead with ID ${leadId} does not exist`);
        }

        // 2. Perform the update inside 'marketingexecutiveleads'
        // Stamping both amount and pendingamount dynamically
        await transactionalEntityManager.update(
          MarketingExecutiveLead,
          { id: leadId },
          {
            amount: dealAmount,
            pendingamount: dealAmount,
          },
        );

        // 3. Insert milestone history tracking inside your exact 'leadevent' table structure
        const milestoneDescription = `Deal amount successfully initialized to ₹${dealAmount.toLocaleString('en-IN')}. Payment tracking enabled.`;

        await transactionalEntityManager.query(
          `INSERT INTO leadevent (leadId, eventName, userId, description, status, createdBy) 
         VALUES (?, ?, ?, ?, ?, ?)`,
          [
            leadId,
            'Deal Amount Set', // eventName category tracking string
            currentUserId, // The executive worker committing the change
            milestoneDescription, // Detailed logs for the modal timeline UI
            1, // Active status configuration flag
            currentUserId, // Metadata audit trail tracking
          ],
        );

        return {
          success: true,
          message:
            'Deal amount set and ledger tracking balances initialized successfully.',
          data: {
            totalAmount: dealAmount,
            pendingAmount: dealAmount,
          },
        };
      },
    );
  }

  async getPaymentSummary(leadId: number) {
    // 1. Get the current status from marketingexecutiveleads
    const lead = await this.leadsRepository.findOne({
      where: { id: leadId.toString() },
      select: ['id', 'amount', 'pendingamount'],
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    const totalDealAmount = Number(lead.amount) || 0;
    const totalPendingAmount = Number(lead.pendingamount) || 0;

    // Total Received is simply total deal minus what is currently left unpaid
    const totalReceivedAmount = Math.max(
      0,
      totalDealAmount - totalPendingAmount,
    );

    // Calculate progress bar percentages safely
    const progressPercentage =
      totalDealAmount > 0
        ? Math.round((totalReceivedAmount / totalDealAmount) * 100)
        : 0;

    return {
      success: true,
      data: {
        dealAmount: totalDealAmount,
        pendingAmount: totalPendingAmount,
        receivedAmount: totalReceivedAmount,
        percentageOfDeal: `${progressPercentage}%`,
      },
    };
  }

  async addPaymentCollectionTransaction(
    dto: AddPaymentDto,
    currentUserId: number,
  ) {
    const { leadId, amount, paymentModeNote } = dto;

    return await this.dataSource.manager.transaction(
      async (transactionalEntityManager) => {
        // 1. Lock down the lead record for exclusive safely processing
        const lead = await transactionalEntityManager.findOne(
          MarketingExecutiveLead,
          {
            where: { id: leadId.toString() },
          },
        );

        if (!lead) {
          throw new NotFoundException(`Lead with ID ${leadId} does not exist`);
        }

        const dealAmount = Number(lead.amount) || 0;
        const currentPending = Number(lead.pendingamount) || 0;

        if (dealAmount === 0) {
          throw new BadRequestException(
            'Initialize a deal amount for this lead before recording payments.',
          );
        }

        // Overpayment prevention check
        if (amount > currentPending) {
          throw new BadRequestException(
            `Overpayment rejected! Max allowed collections balance outstanding is ₹${currentPending.toLocaleString('en-IN')}`,
          );
        }

        // 2. Calculate the brand new remaining unpaid balances
        const updatedPendingAmount = currentPending - amount;

        // 3. Update the tracking columns directly inside marketingexecutiveleads
        await transactionalEntityManager.update(
          MarketingExecutiveLead,
          { id: leadId },
          { pendingamount: updatedPendingAmount },
        );

        // 4. Insert transactional backup item records row inside 'leadpaymentmappings'
        await transactionalEntityManager.query(
          `INSERT INTO leadpaymentmappings (leadId, amount, paymentMode, paymentStatus, paymentDate, createdBy) 
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
          [
            leadId,
            amount,
            paymentModeNote, // Maps text input field context logs (e.g. UPI, Cheque number)
            1, // Status flag confirmation
            currentUserId, // Authentication identity audit trail records
          ],
        );

        // 5. Build dynamic description text to dump into the global 'leadevent' profile timeline
        const logDescription = `Payment Received: ₹${amount.toLocaleString('en-IN')}. Reference Note: "${paymentModeNote}". Remaining outstanding balance: ₹${updatedPendingAmount.toLocaleString('en-IN')}.`;

        await transactionalEntityManager.query(
          `INSERT INTO leadevent (leadId, eventName, userId, description, status, createdBy) 
         VALUES (?, ?, ?, ?, ?, ?)`,
          [
            leadId,
            'Payment Received',
            currentUserId,
            logDescription,
            1,
            currentUserId,
          ],
        );

        return {
          success: true,
          message:
            'Payment collection logged successfully, balance logs synchronized.',
          updatedSummary: {
            receivedAmount: dealAmount - updatedPendingAmount,
            pendingAmount: updatedPendingAmount,
          },
        };
      },
    );
  }
}
