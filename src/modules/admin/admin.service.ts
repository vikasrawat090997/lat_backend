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
import { AssignmentTabFilter, LeadStatus } from 'src/utils/enums';
import * as fs from 'fs'; // Import Node's filesystem module to delete files
import { AssignSiteVisitorDto } from './dto/assign-site-vistor.dto';
import { SetDealAmountDto } from './dto/set-deal-amount.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { AssignInstallerDto } from './dto/assign-installer.dto';
import { DealsTabFilter, GetDealsBoardDto } from './dto/get-deals-board.dto';
import { GetAssignmentsQueryDto } from './dto/get-site-visitor-assignment.dto';
import { CallStatusSelection, LogContactDto } from './dto/log-contact.dto';
import { ScheduleVisitDto } from './dto/schedule-visit.dto';
import { CompleteVisitDto } from './dto/complete-visit.dto';

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

  /**
   * API 1: Fetches all active users with Installer/Technician privileges
   */
  async getAvailableInstallers() {
    try {
      // Direct raw query or repository lookup on usermaster
      const visitors = await this.dataSource.manager.query(
        `SELECT id, fullName, email 
         FROM usermaster 
         WHERE roleId = 4 AND status = 1`, // Assuming 4 = Installer Partner, 1 = Active
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
        error.message || 'Failed to fetch installer',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * API 2: Transactional database method to safely assign the technician installer
   */
  async assignInstallerTransaction(
    dto: AssignInstallerDto,
    currentUserId: number,
  ) {
    const { leadId, installerUserId, notes } = dto;

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
          [installerUserId],
        );

        if (!visitorUser || visitorUser.length === 0) {
          throw new NotFoundException(
            `Installer with ID ${installerUserId} not found`,
          );
        }
        const visitorName = visitorUser.fullName;

        // 3. Update the assignment columns and pipeline status on the lead
        await transactionalEntityManager.update(
          MarketingExecutiveLead,
          { id: leadId },
          {
            siteVisitorUserId: installerUserId.toString(),
            status: LeadStatus.ASSIGNED_TO_TECHNICIAN, // Updates core lead status tracking
          },
        );

        // 4. Construct description timeline text including any optional instructions typed into the modal
        let eventDescription = `Lead assigned to Installer: ${visitorName}.`;
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
            installerUserId, // Target worker handling this event stage now
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

    // =========================================================================
    // NEW EXTENSION: Fetch structural ledger lines from leadpaymentmappings
    // =========================================================================
    const paymentLogs = await this.leadsRepository.manager
      .createQueryBuilder()
      .select([
        'p.id AS id',
        'p.amount AS amount',
        'p.paymentMode AS paymentMode',
        'p.createdAt AS createdAt',
      ])
      .from('leadpaymentmappings', 'p')
      .where('p.leadId = :leadId AND p.status = 1', { leadId })
      .orderBy('p.createdAt', 'DESC') // Newest payment installments show at the top of the timeline
      .getRawMany();

    // Format individual history entry logs to match UI component fields cleanly
    const historyList = paymentLogs.map((log, index) => {
      // Formats the index counter mapping inversely (e.g. 1, 2, 3) or keeps it raw
      return {
        paymentIndex: paymentLogs.length - index, // Helpful for rendering the left item badge number
        amount: parseFloat(log.amount || '0'),
        note: log.paymentMode || '', // Maps your comment text column (e.g. "wdesfdrgftyu")
        dateString: log.createdAt
          ? new Date(log.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : '18 Jun 2026', // Output formats natively to "18 Jun 2026" matching your image header
      };
    });
    return {
      success: true,
      data: {
        dealAmount: totalDealAmount,
        pendingAmount: totalPendingAmount,
        receivedAmount: totalReceivedAmount,
        percentageOfDeal: `${progressPercentage}%`,
        // Dynamic bottom indicator summaries
        totalPaymentsCount: historyList.length,
        paymentCountText: `${historyList.length} payment${historyList.length !== 1 ? 's' : ''}`, // Returns "1 payment" or "2 payments"

        // New extra response key to map your dynamic list items instantly
        paymentHistory: historyList,
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

  /**
   * Fetches overall analytics summaries for the main operational dashboard metrics viewport
   */
  async getGlobalDashboardCounters() {
    try {
      const rawMetrics = await this.leadsRepository
        .createQueryBuilder('lead')
        .select('COUNT(lead.id)', 'totalLeads')

        // 1. Pending Review: Status is explicitly Query Sent (or map to Under Review based on your preference)
        .addSelect(
          `SUM(CASE WHEN lead.status = :pendingReviewStatus THEN 1 ELSE 0 END)`,
          'pendingReviewCount',
        )

        // 2. Completed: Status has hit the final target lifecycle stage milestones
        .addSelect(
          `SUM(CASE WHEN lead.status IN (:...completedStatuses) THEN 1 ELSE 0 END)`,
          'completedCount',
        )

        // 3. In Pipeline: Active statuses array mapping
        .addSelect(
          `SUM(CASE WHEN lead.status IN (:...pipelineStatuses) THEN 1 ELSE 0 END)`,
          'inPipelineCount',
        )
        // Bind all parameters down here to securely escape quotes and handle arrays perfectly
        .setParameters({
          pendingReviewStatus: LeadStatus.QUERY_SENT, // If your UI means 'Under Review', switch this to LeadStatus.UNDER_REVIEW
          completedStatuses: [
            LeadStatus.PAYMENT_COMPLETED,
            LeadStatus.QUERY_CLOSED,
          ],
          pipelineStatuses: [
            LeadStatus.QUERY_SENT,
            LeadStatus.CONTACTED,
            LeadStatus.APPROVED,
            LeadStatus.SITE_VISIT_COMPLETED,
            LeadStatus.INSTALLATION_STARTED,
          ],
        })
        .getRawOne();

      // Convert database string outputs into clean numbers
      const totalLeads = parseInt(rawMetrics.totalLeads || '0', 10);
      const pendingReview = parseInt(rawMetrics.pendingReviewCount || '0', 10);
      const inPipeline = parseInt(rawMetrics.inPipelineCount || '0', 10);
      const completed = parseInt(rawMetrics.completedCount || '0', 10);

      return {
        success: true,
        data: {
          totalLeads,
          pendingReview,
          inPipeline,
          completed,
        },
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to aggregate top dashboard box values',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Fetches the breakdown counts for each individual visual pipeline stage bar
   */
  async getPipelineStagesBreakdown() {
    try {
      const rawMetrics = await this.leadsRepository
        .createQueryBuilder('lead')
        // Total Active Indicator (Total active rows currently tracked in operational pipeline)
        .select('COUNT(lead.id)', 'totalActive')

        // 1. New / Review Bar (Groups initial validation statuses)
        .addSelect(
          `SUM(CASE WHEN lead.status IN (:...newReviewStatuses) THEN 1 ELSE 0 END)`,
          'newReviewCount',
        )
        // 2. Contacted Bar
        .addSelect(
          `SUM(CASE WHEN lead.status = :contactedStatus THEN 1 ELSE 0 END)`,
          'contactedCount',
        )
        // 3. Approved Bar
        .addSelect(
          `SUM(CASE WHEN lead.status = :approvedStatus THEN 1 ELSE 0 END)`,
          'approvedCount',
        )
        // 4. Site Visit Bar (Groups all active fieldwork steps)
        .addSelect(
          `SUM(CASE WHEN lead.status IN (:...siteVisitStatuses) THEN 1 ELSE 0 END)`,
          'siteVisitCompletedCount',
        )
        // 5. Installation Bar (Groups everything relating to mechanical setup builds)
        .addSelect(
          `SUM(CASE WHEN lead.status IN (:...installationStatuses) THEN 1 ELSE 0 END)`,
          'installationStartedCount',
        )
        // Securely bind all enum sets to prevent unquoted string crashes
        .setParameters({
          newReviewStatuses: [LeadStatus.QUERY_SENT],
          contactedStatus: LeadStatus.CONTACTED,
          approvedStatus: LeadStatus.APPROVED,
          siteVisitStatuses: [LeadStatus.SITE_VISIT_COMPLETED],
          installationStatuses: [LeadStatus.INSTALLATION_STARTED],
        })
        .getRawOne();

      return {
        success: true,
        data: {
          activeTotal: parseInt(rawMetrics.totalActive || '0', 10),
          stages: [
            {
              label: 'Query Sent',
              count: parseInt(rawMetrics.newReviewCount || '0', 10),
              color: 'orange',
            },
            {
              label: 'Contacted',
              count: parseInt(rawMetrics.contactedCount || '0', 10),
              color: 'purple',
            },
            {
              label: 'Approved',
              count: parseInt(rawMetrics.approvedCount || '0', 10),
              color: 'blue',
            },
            {
              label: 'Site Visit Completed',
              count: parseInt(rawMetrics.siteVisitCompletedCount || '0', 10),
              color: 'cyan',
            },
            {
              label: 'Installation',
              count: parseInt(rawMetrics.installationStartedCount || '0', 10),
              color: 'deep-orange',
            },
          ],
        },
      };
    } catch (error: any) {
      throw new HttpException(
        error.message ||
          'Failed to aggregate pipeline analytics breakdown data arrays',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Aggregates system-wide financial statistics for the global dashboard payment overview overview cards
   */
  async getGlobalPaymentOverview() {
    try {
      const metrics = await this.leadsRepository
        .createQueryBuilder('lead')
        // Count how many leads actually have an initialized deal value set
        .select('COUNT(CASE WHEN lead.amount > 0 THEN 1 END)', 'dealCount')
        // Sum up total locked business value contracts
        .addSelect('SUM(lead.amount)', 'totalDealValue')
        // Sum up total remaining outstanding balances
        .addSelect('SUM(lead.pendingamount)', 'totalPending')
        .getRawOne();

      const dealCount = parseInt(metrics.dealCount || '0', 10);
      const totalDealValue = parseFloat(metrics.totalDealValue || '0');
      const totalPending = parseFloat(metrics.totalPending || '0');

      // Received amount is the difference between total deal value and what is outstanding
      const totalReceived = Math.max(0, totalDealValue - totalPending);

      return {
        success: true,
        data: {
          dealsCount: dealCount,
          dealValue: totalDealValue,
          received: totalReceived,
          pending: totalPending,
        },
      };
    } catch (error: any) {
      throw new HttpException(
        error.message ||
          'Failed to compile financial ledger analytics overview metrics',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Fetches actionable items broken down by bucket types for the dashboard sidebar lists
   */
  async getActionRequiredList() {
    try {
      // 1. Target all active target states that need attention from the table
      const targetStatuses = [
        `${LeadStatus.QUERY_SENT}`,
        `${LeadStatus.ASSIGNED_TO_SITE_VISITOR}`,
        `${LeadStatus.ASSIGNED_TO_TECHNICIAN}`,
      ];

      const activeLeads = await this.leadsRepository
        .createQueryBuilder('lead')
        .select([
          'lead.id AS id',
          'lead.fullName AS name',
          'lead.status AS status',
          'lead.createdAt AS createdAt',
        ])
        .where('lead.status IN (:...targetStatuses)', { targetStatuses })
        .orderBy('lead.createdAt', 'DESC') // Newest items show first within their buckets
        .getRawMany();

      // 2. Filter and isolate each bucket independently, limiting rows to exactly 5 items max

      // Bucket A: Pending Review (Matches Query Sent or Under Review)
      const pendingReviewItems = activeLeads
        .filter((lead) => lead.status === `${LeadStatus.QUERY_SENT}`)
        .slice(0, 5);

      // Bucket B: Needs Site Visitor
      const needsSiteVisitorItems = activeLeads
        .filter(
          (lead) => lead.status === `${LeadStatus.ASSIGNED_TO_SITE_VISITOR}`,
        )
        .slice(0, 5);

      // Bucket C: Needs Installer / Technician
      const needsInstallerItems = activeLeads
        .filter(
          (lead) => lead.status === `${LeadStatus.ASSIGNED_TO_TECHNICIAN}`,
        )
        .slice(0, 5);

      // 3. Format helper mapping helper to construct presentation Lead ID strings (e.g. SJ-2026-003)
      const formatItem = (item: any) => {
        const year = item.createdAt
          ? new Date(item.createdAt).getFullYear()
          : 2026;
        return {
          id: parseInt(item.id, 10),
          name: item.name,
          leadIdString: `SJ-${year}-${String(item.id).padStart(3, '0')}`,
        };
      };

      // 4. Calculate total actionable items across all pipelines for the top-right red count badge
      const totalItemsCount =
        pendingReviewItems.length +
        needsSiteVisitorItems.length +
        needsInstallerItems.length;

      return {
        totalActionRequiredItems: totalItemsCount, // Renders the top-right pill badge ("6 items")
        buckets: {
          pendingReview: {
            title: `Pending Review `,
            count: pendingReviewItems.length,
            items: pendingReviewItems.map(formatItem),
          },
          needsSiteVisitor: {
            title: `Needs Site Visitor`,
            count: needsSiteVisitorItems.length,
            items: needsSiteVisitorItems.map(formatItem),
          },
          needsInstaller: {
            title: `Needs Installer`,
            count: needsInstallerItems.length,
            items: needsInstallerItems.map(formatItem),
          },
        },
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to assemble action items lists',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Computes ledger-wide operational metrics for the dynamic financial summary viewport cards
   */
  async getFinancesSummaryDashboard() {
    try {
      const metrics = await this.leadsRepository
        .createQueryBuilder('lead')
        // Card 1 Metrics: Total tracked deals count & total value
        .select(
          'COUNT(CASE WHEN lead.amount > 0 THEN 1 END)',
          'trackedDealsCount',
        )
        .addSelect('SUM(lead.amount)', 'totalDealValue')

        // Card 2 Metrics: Sum of total currency collected
        .addSelect(
          'SUM(lead.amount - lead.pendingamount)',
          'totalCollectedValue',
        )

        // Card 3 Metrics: Outstanding balance sums and partial counts tracking
        .addSelect('SUM(lead.pendingamount)', 'totalOutstandingValue')
        .addSelect(
          `COUNT(CASE WHEN lead.pendingamount > 0 AND lead.pendingamount < lead.amount THEN 1 END)`,
          'partialDealsCount',
        )

        // Card 4 Metrics: Fully settled deal parameters
        .addSelect(
          `COUNT(CASE WHEN lead.amount > 0 AND lead.pendingamount = 0 THEN 1 END)`,
          'fullyPaidCount',
        )
        .getRawOne();

      // Convert database string response values safely into clean number primitives
      const trackedDealsCount = parseInt(metrics.trackedDealsCount || '0', 10);
      const totalDealValue = parseFloat(metrics.totalDealValue || '0');
      const totalCollected = parseFloat(metrics.totalCollectedValue || '0');
      const totalOutstanding = parseFloat(metrics.totalOutstandingValue || '0');
      const partialDealsCount = parseInt(metrics.partialDealsCount || '0', 10);
      const fullyPaidCount = parseInt(metrics.fullyPaidCount || '0', 10);

      // Calculate progress percentage ratios securely
      const collectedPercentage =
        totalDealValue > 0
          ? Math.round((totalCollected / totalDealValue) * 100)
          : 0;

      return {
        success: true,
        data: {
          totalDealValue: {
            value: totalDealValue,
            count: trackedDealsCount,
          },
          collected: {
            value: totalCollected,
            percentage: collectedPercentage,
          },
          outstanding: {
            value: totalOutstanding,
            count: partialDealsCount,
          },
          fullyPaid: {
            count: fullyPaidCount,
            fullyPaidCount,
            trackedDealsCount,
          },
        },
      };
    } catch (error: any) {
      throw new HttpException(
        error.message ||
          'Failed to aggregate systems ledger summary matrix variables',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Fetches the dynamic list of financial deals matching the current search parameters and tab filter selection
   */
  async getDealsBoardData(query: GetDealsBoardDto) {
    try {
      const { search, tab } = query;
      const queryBuilder = this.leadsRepository.createQueryBuilder('mel');

      // 1. Select primary rows and join to retrieve the original Marketing Executive name
      queryBuilder
        .select([
          'mel.id AS id',
          'mel.fullName AS customerName',
          'mel.phoneNumber AS phoneNumber',
          'mel.status AS status',
          'mel.amount AS dealValue',
          'mel.pendingamount AS pendingAmount',
          'mel.createdAt AS createdAt',
          'um.fullName AS marketingExecName',
        ])
        .innerJoin('usermaster', 'um', 'um.id = mel.userId');

      // 2. Handle Tab-Specific Filter Logic
      switch (tab) {
        case DealsTabFilter.IN_PROGRESS:
          // In Progress: Has a deal set, but still has an outstanding balance unpaid
          queryBuilder.andWhere('mel.amount > 0 AND mel.pendingamount > 0');
          break;
        case DealsTabFilter.FULLY_PAID:
          // Fully Paid: Has a deal set and the outstanding balance is completely cleared
          queryBuilder.andWhere('mel.amount > 0 AND mel.pendingamount = 0');
          break;
        case DealsTabFilter.NO_DEAL:
          // No Deal Set: Deal amount value is still 0 or unassigned
          queryBuilder.andWhere('(mel.amount = 0 OR mel.amount IS NULL)');
          break;
        case DealsTabFilter.ALL:
        default:
          // No explicit filter for 'all' tab, retrieves everything matching text queries
          break;
      }

      // 3. Handle Global Input Search Textbox Filter
      if (search && search.trim() !== '') {
        const searchKeyword = `%${search.trim()}%`;
        queryBuilder.andWhere(
          `(mel.fullName LIKE :searchKeyword OR 
            mel.phoneNumber LIKE :searchKeyword OR 
            CAST(mel.id AS CHAR) LIKE :searchKeyword)`,
          { searchKeyword },
        );
      }

      // Sort by newest entries first
      queryBuilder.orderBy('mel.createdAt', 'DESC');

      const rawRows = await queryBuilder.getRawMany();

      // 4. Gather overall tab header counter totals across the system (ignores current tab but respects text search)
      const countersQuery = this.leadsRepository
        .createQueryBuilder('mel')
        .select('COUNT(mel.id)', 'allCount')
        .addSelect(
          `COUNT(CASE WHEN mel.amount > 0 AND mel.pendingamount > 0 THEN 1 END)`,
          'inProgressCount',
        )
        .addSelect(
          `COUNT(CASE WHEN mel.amount > 0 AND mel.pendingamount = 0 THEN 1 END)`,
          'fullyPaidCount',
        )
        .addSelect(
          `COUNT(CASE WHEN mel.amount = 0 OR mel.amount IS NULL THEN 1 END)`,
          'noDealCount',
        );

      if (search && search.trim() !== '') {
        const searchKeyword = `%${search.trim()}%`;
        countersQuery.where(
          `(mel.fullName LIKE :searchKeyword OR mel.phoneNumber LIKE :searchKeyword OR CAST(mel.id AS CHAR) LIKE :searchKeyword)`,
          { searchKeyword },
        );
      }
      const rawCounters = await countersQuery.getRawOne();

      // 5. Format the row payload dataset to map cleanly onto your UI layout
      const mappedRows = rawRows.map((row) => {
        const dealValue = parseFloat(row.dealValue || '0');
        const pendingAmount = parseFloat(row.pendingAmount || '0');
        const receivedAmount = Math.max(0, dealValue - pendingAmount);

        // Calculate collection bar completion percentage
        const collectionPercentage =
          dealValue > 0 ? Math.round((receivedAmount / dealValue) * 100) : 0;

        const year = row.createdAt
          ? new Date(row.createdAt).getFullYear()
          : 2026;

        return {
          id: parseInt(row.id, 10),
          leadIdString: `SJ-${year}-${String(row.id).padStart(3, '0')}`,
          customerName: row.customerName,
          phoneNumber: row.phoneNumber,
          marketingExecName: row.marketingExecName,
          status: row.status,
          hasDealSet: dealValue > 0, // Flag for frontend to conditionally switch to the "No deal set" badge view
          financials:
            dealValue > 0
              ? {
                  dealValue,
                  receivedAmount,
                  pendingAmount,
                  progressPercentage: `${collectionPercentage}%`,
                }
              : null,
        };
      });

      return {
        success: true,
        meta: {
          tabs: {
            all: parseInt(rawCounters.allCount || '0', 10),
            inProgress: parseInt(rawCounters.inProgressCount || '0', 10),
            fullyPaid: parseInt(rawCounters.fullyPaidCount || '0', 10),
            noDeal: parseInt(rawCounters.noDealCount || '0', 10),
          },
        },
        data: mappedRows,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message ||
          'Failed to process financial deals board data matrices',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Fetches assignments for a specific site visitor, structures the stepper pipeline,
   * and builds descending timeline history arrays for every single card.
   */
  async getVisitorAssignmentsList(
    query: GetAssignmentsQueryDto,
    siteVisitorId: number,
  ) {
    try {
      const { search, tab } = query;
      const queryBuilder = this.leadsRepository.createQueryBuilder('mel');

      // 1. Fetch core data and fetch the raw assignments assigned to this visitor
      queryBuilder
        .select([
          'mel.id AS id',
          'mel.fullName AS customerName',
          'mel.phoneNumber AS phoneNumber',
          'mel.address AS address',
          'mel.status AS status',
          'mel.createdAt AS createdAt',
        ])
        .where('mel.siteVisitorUserId = :siteVisitorId', { siteVisitorId });

      // 2. Tab filtering logic mapping (FIXED: Using safe parameterized tokens)
      switch (tab) {
        case AssignmentTabFilter.NEW:
          queryBuilder.andWhere('mel.status = :newStatus');
          break;
        case AssignmentTabFilter.IN_PROGRESS:
          queryBuilder.andWhere('mel.status IN (:...inProgressStatuses)');
          break;
        case AssignmentTabFilter.COMPLETED:
          queryBuilder.andWhere('mel.status = :completedStatus');
          break;
        case AssignmentTabFilter.CLOSED:
          queryBuilder.andWhere('mel.status = :closedStatus');
          break;
        default:
          break;
      }

      // 3. Text search query block
      if (search && search.trim() !== '') {
        const searchKeyword = `%${search.trim()}%`;
        queryBuilder.andWhere(
          `(mel.fullName LIKE :searchKeyword OR 
          mel.phoneNumber LIKE :searchKeyword OR 
          CAST(mel.id AS CHAR) LIKE :searchKeyword)`,
          { searchKeyword },
        );
      }

      // Bind parameters for the main query list
      queryBuilder.setParameters({
        newStatus: LeadStatus.ASSIGNED_TO_SITE_VISITOR,
        inProgressStatuses: [
          LeadStatus.CONTACTED,
          LeadStatus.NOT_CONTACTED,
          LeadStatus.SITE_VISIT_SCHEDULED,
        ],
        completedStatus: LeadStatus.SITE_VISIT_COMPLETED,
        closedStatus: LeadStatus.QUERY_CLOSED,
      });

      queryBuilder.orderBy('mel.createdAt', 'DESC');
      const rawLeads = await queryBuilder.getRawMany();

      // 4. Calculate tab counts for headers (FIXED: Bound parameters to avoid syntax crash)
      const counters = await this.leadsRepository
        .createQueryBuilder('mel')
        .select('COUNT(mel.id)', 'allCount')
        .addSelect(
          `COUNT(CASE WHEN mel.status = :cNewStatus THEN 1 END)`,
          'newCount',
        )
        .addSelect(
          `COUNT(CASE WHEN mel.status IN (:...cInProgressStatuses) THEN 1 END)`,
          'inProgressCount',
        )
        .addSelect(
          `COUNT(CASE WHEN mel.status = :cCompletedStatus THEN 1 END)`,
          'completedCount',
        )
        .addSelect(
          `COUNT(CASE WHEN mel.status = :cClosedStatus THEN 1 END)`,
          'closedCount',
        )
        .where('mel.siteVisitorUserId = :siteVisitorId', { siteVisitorId })
        .setParameters({
          cNewStatus: LeadStatus.ASSIGNED_TO_SITE_VISITOR,
          cInProgressStatuses: [
            LeadStatus.CONTACTED,
            LeadStatus.NOT_CONTACTED,
            LeadStatus.SITE_VISIT_SCHEDULED,
          ],
          cCompletedStatus: LeadStatus.SITE_VISIT_COMPLETED,
          cClosedStatus: LeadStatus.QUERY_CLOSED,
        })
        .getRawOne();

      // 5. Gather full leadevent logs for all matching records
      const leadIds = rawLeads.map((l) => parseInt(l.id, 10));
      let allEvents = [];

      if (leadIds.length > 0) {
        allEvents = await this.leadsRepository.manager
          .createQueryBuilder()
          .select([
            'le.leadId AS leadId',
            'le.id AS eventId',
            'le.eventName AS eventName',
            'le.description AS description',
            'le.createdAt AS createdAt',
            'um.fullName AS doneBy',
            'rm.name AS roleName',
          ])
          .from('leadevent', 'le')
          .leftJoin('usermaster', 'um', 'um.id = le.userId')
          .leftJoin('rolemaster', 'rm', 'rm.id = um.roleId')
          .where('le.leadId IN (:...leadIds)', { leadIds })
          .orderBy('le.createdAt', 'DESC')
          .getRawMany();
      }
      // 6. Map rows cleanly onto the complex layout structures seen in the image view
      const formattedData = rawLeads.map((row) => {
        const leadIdNum = parseInt(row.id, 10);
        const year = row.createdAt
          ? new Date(row.createdAt).getFullYear()
          : 2026;
        const currentStatus = row.status;

        // Stepper state resolver calculations
        let progressStep = 1;
        if (currentStatus === LeadStatus.CONTACTED || LeadStatus.NOT_CONTACTED)
          progressStep = 2;
        if (currentStatus === LeadStatus.SITE_VISIT_SCHEDULED) progressStep = 3;
        if (currentStatus === LeadStatus.SITE_VISIT_COMPLETED) progressStep = 4;

        // Isolate events belonging specifically to this row card path
        const matchingHistory = allEvents
          .filter((e) => parseInt(e.leadId, 10) === leadIdNum)
          .map((e) => ({
            id: e.eventId,
            title: e.eventName,
            detail: e.description,
            operator: e.doneBy || 'System',
            operatorRole: e.roleName || 'System',
            timestamp: e.createdAt,
          }));

        return {
          id: leadIdNum,
          leadIdString: `SJ-${year}-${String(leadIdNum).padStart(3, '0')}`,
          customerName: row.customerName,
          phoneNumber: row.phoneNumber,
          address: row.address,
          status: currentStatus,

          // Stepper indicator tracking mappings
          stepper: {
            currentStepIndex: progressStep,
            steps: [
              { label: 'Assigned', completed: progressStep >= 1 },
              { label: 'Contacted', completed: progressStep >= 2 },
              { label: 'Scheduled', completed: progressStep >= 3 },
              { label: 'Visit Done', completed: progressStep >= 4 },
            ],
          },

          // Array containing full timeline history elements sorted DESC
          timelineEvents: matchingHistory,
        };
      });

      return {
        success: true,
        meta: {
          tabs: {
            all: parseInt(counters.allCount || '0', 10),
            new: parseInt(counters.newCount || '0', 10),
            inProgress: parseInt(counters.inProgressCount || '0', 10),
            completed: parseInt(counters.completedCount || '0', 10),
            closed: parseInt(counters.closedCount || '0', 10),
          },
        },
        data: formattedData,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message ||
          'Failed to populate assignments dashboard matrix bundles',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Safe transactional operation logging call details and moving the assignment progress forward
   */
  async logInitialContactTransaction(
    dto: LogContactDto,
    currentUserId: number,
  ) {
    const { leadId, callStatus, callRemarks } = dto;

    return await this.dataSource.manager.transaction(
      async (transactionalEntityManager) => {
        // 1. Validate target lead row existence
        const lead = await transactionalEntityManager.findOne(
          MarketingExecutiveLead,
          {
            where: { id: leadId.toString() },
          },
        );

        if (!lead) {
          throw new NotFoundException(`Lead with ID ${leadId} does not exist`);
        }

        // 2. Determine target workflow tracking state based on call status selection outcome
        let updatedLeadStatus = lead.status; // Default fallback: hold current status state

        if (callStatus === CallStatusSelection.CONNECTED) {
          // Successful connection moves lead onto the "Contacted" stage tier mapping
          updatedLeadStatus = LeadStatus.SITE_VISIT_SCHEDULED;
        } else if (callStatus === CallStatusSelection.NOT_CONNECTED) {
          // Disqualifying parameters drop the profile directly into 'Rejected'
          updatedLeadStatus = LeadStatus.NOT_CONTACTED;
        } else if (
          callStatus === CallStatusSelection.NOT_INTERESTED ||
          callStatus === CallStatusSelection.WRONG_NUMBER
        ) {
          // Disqualifying parameters drop the profile directly into 'Rejected'
          updatedLeadStatus = LeadStatus.QUERY_CLOSED;
        }

        // 3. Apply updates down into the marketingexecutiveleads table
        await transactionalEntityManager.update(
          MarketingExecutiveLead,
          { id: leadId },
          { status: updatedLeadStatus },
        );

        // 4. Formulate the comprehensive text log payload block for timeline histories
        const combinedDescription = `[Call Status: ${callStatus}] — Remarks: "${callRemarks}"`;

        // 5. Build and insert the backup audit record row directly into 'leadevent'
        await transactionalEntityManager.query(
          `INSERT INTO leadevent (leadId, eventName, userId, description, status, createdBy) 
         VALUES (?, ?, ?, ?, ?, ?)`,
          [
            leadId,
            callStatus,
            currentUserId, // The specific field worker logging this interaction
            combinedDescription,
            1, // Active status code tracking flag
            currentUserId, // Creator audit tracking path mapping
          ],
        );

        return {
          success: true,
          message: `Contact logs saved successfully. Pipeline status shifted to: ${updatedLeadStatus}`,
          data: {
            currentStatus: updatedLeadStatus,
          },
        };
      },
    );
  }

  /**
   * Transactional operation that logs appointments and moves the lead status forward
   */
  async scheduleSiteVisitTransaction(
    dto: ScheduleVisitDto,
    currentUserId: number,
  ) {
    const { leadId, visitDate, timeSlot, notes } = dto;

    return await this.dataSource.manager.transaction(
      async (transactionalEntityManager) => {
        // 1. Confirm the lead profile context exists
        const lead = await transactionalEntityManager.findOne(
          MarketingExecutiveLead,
          {
            where: { id: leadId.toString() },
          },
        );

        if (!lead) {
          throw new NotFoundException(`Lead with ID ${leadId} does not exist`);
        }

        // 2. Advance the primary lead pipeline status index to "Site Visit Scheduled"
        await transactionalEntityManager.update(
          MarketingExecutiveLead,
          { id: leadId },
          { status: LeadStatus.SITE_VISIT_SCHEDULED },
        );

        // 3. Insert row data into your newly declared 'leadsitevisitschedules' tracker mapping table
        await transactionalEntityManager.query(
          `INSERT INTO leadsitevisitschedules (leadId, visitDate, timeSlot, notes, createdBy) 
         VALUES (?, ?, ?, ?, ?)`,
          [leadId, visitDate, timeSlot, notes || null, currentUserId],
        );

        // 4. Construct detailed text timeline records string context blocks
        const cleanDate = new Date(visitDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        let historyDescription = `Site visit scheduled for ${cleanDate} during the [${timeSlot}] window.`;
        if (notes && notes.trim() !== '') {
          historyDescription += ` | Extra Notes: "${notes.trim()}"`;
        }

        // 5. Commit record straight into your exact 'leadevent' tracking framework layout
        await transactionalEntityManager.query(
          `INSERT INTO leadevent (leadId, eventName, userId, description, status, createdBy) 
         VALUES (?, ?, ?, ?, ?, ?)`,
          [
            leadId,
            LeadStatus.SITE_VISIT_SCHEDULED,
            currentUserId,
            historyDescription,
            1,
            currentUserId,
          ],
        );

        return {
          success: true,
          message:
            'Field visit appointment locked down and system timelines updated successfully.',
          data: {
            assignedStatus: 'Site Visit Scheduled',
            date: visitDate,
            timeSlot,
          },
        };
      },
    );
  }

  async completeSiteVisitTransaction(
    dto: CompleteVisitDto,
    leadId: number,
    files: Express.Multer.File[],
    currentUserId: number,
  ) {
    const { assessmentNotes } = dto;

    try {
      return await this.dataSource.manager.transaction(
        async (transactionalEntityManager) => {
          // 1. Check if lead exists
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

          // 2. Advance target master lead pipeline status
          await transactionalEntityManager.update(
            MarketingExecutiveLead,
            { id: leadId },
            { status: LeadStatus.SITE_VISIT_COMPLETED },
          );

          // 3. Loop through files and insert paths into marketingexecutivedocumentmapping
          for (const file of files) {
            const targetUrl = `uploads/marketingExecutive/${file.filename}`;
            await transactionalEntityManager.query(
              `INSERT INTO marketingexecutivedocumentmapping (leadId, documentTypeId, documentUrl, originalName) 
             VALUES (?, ?, ?, ?)`,
              [leadId, 6, targetUrl, file.originalname], // Assuming documentTypeId = 1 for Roof Assessment Photos
            );
          }

          // 4. Record permanent tracking item in leadevent log history
          const eventDescription = `Site Visit Completed. Notes: "${assessmentNotes}" | [Photos Attached: ${files.length}]`;
          await transactionalEntityManager.query(
            `INSERT INTO leadevent (leadId, eventName, userId, description, status, createdBy) 
           VALUES (?, ?, ?, ?, 1, ?)`,
            [
              leadId,
              LeadStatus.SITE_VISIT_COMPLETED,
              currentUserId,
              eventDescription,
              currentUserId,
            ],
          );

          return {
            success: true,
            message:
              'Site assessment details and photographs saved successfully.',
            uploadedCount: files.length,
          };
        },
      );
    } catch (error: any) {
      // =========================================================================
      // EXCEPTION TRANSACTION FILE CLEANUP
      // Wipes out uploaded images if database transaction errors out
      // =========================================================================
      for (const file of files) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }

      throw new HttpException(
        error.message ||
          'Failed to complete site visit workflow, media files cleaned up.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Aggregates field pipeline funnel numbers and conversion conversion metrics for a site visitor dashboard
   */
  async getVisitorFunnelStats(siteVisitorId: number) {
    try {
      const metrics = await this.leadsRepository
        .createQueryBuilder('lead')
        // 1. Baseline total active assignments count tracker
        .select('COUNT(lead.id)', 'assignedCount')

        // 2. Count buckets per structural state (FIXED: Uses valid conditional SQL syntax & bound parameters)
        .addSelect(
          `COUNT(CASE WHEN lead.status IN (:contactedStatus, :notContactedStatus) THEN 1 END)`,
          'contactedCount',
        )
        .addSelect(
          `COUNT(CASE WHEN lead.status = :scheduledStatus THEN 1 END)`,
          'scheduledCount',
        )
        .addSelect(
          `COUNT(CASE WHEN lead.status = :completedStatus THEN 1 END)`,
          'completedCount',
        )
        .addSelect(
          `COUNT(CASE WHEN lead.status = :closedStatus THEN 1 END)`,
          'closedCount',
        )
        .where('lead.siteVisitorUserId = :siteVisitorId', { siteVisitorId })

        // 3. Securely bind your LeadStatus values to avoid SQL parser crashes
        .setParameters({
          contactedStatus: LeadStatus.CONTACTED,
          notContactedStatus: LeadStatus.NOT_CONTACTED,
          scheduledStatus: LeadStatus.SITE_VISIT_SCHEDULED,
          completedStatus: LeadStatus.SITE_VISIT_COMPLETED,
          closedStatus: LeadStatus.QUERY_CLOSED,
        })
        .getRawOne();

      const assigned = parseInt(metrics.assignedCount || '0', 10);
      const contacted = parseInt(metrics.contactedCount || '0', 10);
      const scheduled = parseInt(metrics.scheduledCount || '0', 10);
      const completed = parseInt(metrics.completedCount || '0', 10);
      const closed = parseInt(metrics.closedCount || '0', 10);

      // Helper inline function to calculate conversion drop-off percentages against the baseline total
      const calcPercentage = (stageCount: number) => {
        return assigned > 0 ? Math.round((stageCount / assigned) * 100) : 0;
      };

      return {
        success: true,
        data: {
          assigned: {
            count: assigned,
          },
          contacted: {
            count: contacted,
            percentageString: `${calcPercentage(contacted)}%`,
          },
          scheduled: {
            count: scheduled,
            percentageString: `${calcPercentage(scheduled)}%`,
          },
          completed: {
            count: completed,
            percentageString: `${calcPercentage(completed)}%`,
          },
          closed: {
            count: closed,
            percentageString: `${calcPercentage(closed)}%`,
          },
        },
      };
    } catch (error: any) {
      throw new HttpException(
        error.message ||
          'Failed to aggregate pipeline conversion metric indices.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Compiles the complete composite summary dashboard context for a specific field visitor user
   */
  async getVisitorHomeDashboard(siteVisitorId: number) {
    try {
      // =========================================================================
      //  SITE VISITS UPCOMING BUCKET
      // =========================================================================
      const upcomingCount = await this.leadsRepository.count({
        where: {
          siteVisitorUserId: siteVisitorId.toString(),
          status: LeadStatus.SITE_VISIT_SCHEDULED,
        },
      });

      const rawUpcomingLead = await this.leadsRepository
        .createQueryBuilder('mel')
        .select([
          'mel.id AS id',
          'mel.fullName AS customerName',
          'mel.address AS address',
          'mel.createdAt AS createdAt',
          'sched.visitDate AS visitDate',
          'sched.timeSlot AS timeSlot',
        ])
        .innerJoin('leadsitevisitschedules', 'sched', 'sched.leadId = mel.id')
        .where(
          'mel.siteVisitorUserId = :siteVisitorId AND mel.status = :status',
          { siteVisitorId, status: LeadStatus.SITE_VISIT_SCHEDULED },
        )
        .orderBy('sched.visitDate', 'ASC')
        .getRawOne();

      let upcomingCard = null;
      if (rawUpcomingLead) {
        const cleanDate = rawUpcomingLead.visitDate
          ? new Date(rawUpcomingLead.visitDate).toLocaleDateString('en-GB')
          : '';
        upcomingCard = {
          id: parseInt(rawUpcomingLead.id, 10),
          customerName: rawUpcomingLead.customerName,
          address: rawUpcomingLead.address,
          scheduleString: `${cleanDate} · ${rawUpcomingLead.timeSlot}`,
        };
      }

      // =========================================================================
      // =========================================================================
      // 4. DATA PANEL D: MY PERFORMANCE METRIC MATRIX (FIXED with Enums & Bindings)
      // =========================================================================
      const metrics = await this.leadsRepository
        .createQueryBuilder('lead')
        .select('COUNT(lead.id)', 'totalAssigned')

        // Counts leads that have progressed to at least the contacted milestone phase
        .addSelect(
          `COUNT(CASE WHEN lead.status IN (:...pContactedStatuses) THEN 1 END)`,
          'contactedCount',
        )
        // Counts leads that have progressed to or past the visit scheduled phase
        .addSelect(
          `COUNT(CASE WHEN lead.status IN (:...pScheduledStatuses) THEN 1 END)`,
          'scheduledCount',
        )
        // Counts leads that are explicitly finished with field deployment visits
        .addSelect(
          `COUNT(CASE WHEN lead.status = :pCompletedStatus THEN 1 END)`,
          'completedCount',
        )
        .where('lead.siteVisitorUserId = :siteVisitorId', { siteVisitorId })

        // Securely lock down all active runtime enum definitions
        .setParameters({
          pContactedStatuses: [LeadStatus.CONTACTED, LeadStatus.NOT_CONTACTED],
          pScheduledStatuses: [LeadStatus.SITE_VISIT_SCHEDULED],
          pCompletedStatus: LeadStatus.SITE_VISIT_COMPLETED,
        })
        .getRawOne();

      const totalAssigned = parseInt(metrics.totalAssigned || '0', 10);
      const contacted = parseInt(metrics.contactedCount || '0', 10);
      const visitsScheduled = parseInt(metrics.scheduledCount || '0', 10);
      const visitsCompleted = parseInt(metrics.completedCount || '0', 10);

      // Fetch dynamic total uploaded roof photos mapping count count
      const photoMetric = await this.dataSource.manager
        .createQueryBuilder()
        .select('COUNT(doc.id)', 'photoCount')
        .from('marketingexecutivedocumentmapping', 'doc')
        .innerJoin('marketingexecutiveleads', 'mel', 'mel.id = doc.leadId')
        .where(
          'mel.siteVisitorUserId = :siteVisitorId AND doc.documentTypeId = 1',
          { siteVisitorId },
        )
        .getRawOne();

      const roofPhotosTaken = parseInt(photoMetric.photoCount || '0', 10);
      const completionRate =
        totalAssigned > 0
          ? Math.round((visitsCompleted / totalAssigned) * 100)
          : 0;

      return {
        success: true,
        data: {
          siteVisitsUpcoming: {
            badgeCount: upcomingCount,
            lead: upcomingCard,
          },
          myPerformance: {
            totalAssigned,
            contacted,
            visitsScheduled,
            visitsCompleted,
            roofPhotosTaken,
            completionRate: `${completionRate}%`,
            progressSubtext: `${visitsCompleted} of ${totalAssigned} visits completed`,
          },
        },
      };
    } catch (error: any) {
      throw new HttpException(
        error.message ||
          'Failed to aggregate landing home dashboard framework.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
