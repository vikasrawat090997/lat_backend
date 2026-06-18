import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';
import { GetLeadsQueryDto } from './dto/all-leads.dto';
import { RejectLeadDto } from './dto/reject-lead.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AssignSiteVisitorDto } from './dto/assign-site-vistor.dto';
import { SetDealAmountDto } from './dto/set-deal-amount.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { AssignInstallerDto } from './dto/assign-installer.dto';
import { GetDealsBoardDto } from './dto/get-deals-board.dto';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('leads')
  async getAllLeads(@Query() query: GetLeadsQueryDto) {
    return await this.adminService.getAllLeads(query);
  }

  @Get('leads-details/:id')
  async getLeadModalData(@Param('id', ParseIntPipe) id: number) {
    return await this.adminService.getLeadDetailsForModal(id);
  }

  @Post('reject')
  @ApiOperation({
    summary:
      'Reject an active pipeline lead with text reasons and audio records',
  })
  @ApiConsumes('multipart/form-data') // 1. CRITICAL: Tells Swagger this endpoint takes files
  @ApiBody({ type: RejectLeadDto }) // 2. CRITICAL: Tells Swagger to build the file upload UI parameters
  @UseInterceptors(
    FileInterceptor('voiceRecording', {
      storage: diskStorage({
        destination: './uploads/marketingExecutive',
        filename: (req, file, callback) => {
          callback(null, `reject-voice-${Date.now()}-${file.originalname}`);
        },
      }),
    }),
  )
  async processLeadRejection(
    @Body() rejectLeadDto: RejectLeadDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const savedFileName = file ? file.filename : undefined;

    return await this.adminService.rejectLeadTransaction(
      rejectLeadDto,
      req.user.userId,
      savedFileName,
    );
  }

  @Post('approve')
  @ApiOperation({
    summary:
      'approve an active pipeline lead with text reasons and audio records',
  })
  @ApiConsumes('multipart/form-data') // 1. CRITICAL: Tells Swagger this endpoint takes files
  @ApiBody({ type: RejectLeadDto }) // 2. CRITICAL: Tells Swagger to build the file upload UI parameters
  @UseInterceptors(
    FileInterceptor('voiceRecording', {
      storage: diskStorage({
        destination: './uploads/marketingExecutive',
        filename: (req, file, callback) => {
          callback(null, `approve-voice-${Date.now()}-${file.originalname}`);
        },
      }),
    }),
  )
  async processLeadApprove(
    @Body() rejectLeadDto: RejectLeadDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const savedFileName = file ? file.filename : undefined;

    return await this.adminService.processLeadApprove(
      rejectLeadDto,
      req.user.userId,
      savedFileName,
    );
  }

  @Get('site-visitors')
  @ApiOperation({
    summary: 'Fetch all available site visitors to populate select list cards',
  })
  async getVisitors() {
    return await this.adminService.getAvailableSiteVisitors();
  }

  @Post('assign-site-visitor')
  @ApiOperation({
    summary:
      'Assign a site visitor to a specific lead and record timeline tracking logs',
  })
  async assignVisitor(
    @Body() assignSiteVisitorDto: AssignSiteVisitorDto,
    @Req() req: any,
  ) {
    return await this.adminService.assignSiteVisitorTransaction(
      assignSiteVisitorDto,
      req.user.userId,
    );
  }

  @Get('installers')
  @ApiOperation({
    summary: 'Fetch all available installers to populate select list cards',
  })
  async getInstallers() {
    return await this.adminService.getAvailableInstallers();
  }

  @Post('assign-installer')
  @ApiOperation({
    summary:
      'Assign an installer to a specific lead and record timeline tracking logs',
  })
  async assignInstaller(
    @Body() assignInstallerDto: AssignInstallerDto,
    @Req() req: any,
  ) {
    return await this.adminService.assignInstallerTransaction(
      assignInstallerDto,
      req.user.userId,
    );
  }

  @Post('set-deal-amount')
  @ApiOperation({
    summary: 'Set total contract deal pricing and initialize tracking balances',
  })
  @ApiBody({ type: SetDealAmountDto })
  async setAmount(@Body() setDealAmountDto: SetDealAmountDto, @Req() req: any) {
    return await this.adminService.setDealAmountTransaction(
      setDealAmountDto,
      req.user.userId,
    );
  }

  @Get('summary/:leadId')
  @ApiOperation({
    summary:
      'Calculate box totals, collected metrics, and progress percentages',
  })
  async getSummary(@Param('leadId', ParseIntPipe) leadId: number) {
    return await this.adminService.getPaymentSummary(leadId);
  }

  @Post('add-collection')
  @ApiOperation({
    summary: 'Append a new payment entry installment item to the database',
  })
  @ApiBody({ type: AddPaymentDto })
  async addCollection(@Body() addPaymentDto: AddPaymentDto, @Req() req: any) {
    return await this.adminService.addPaymentCollectionTransaction(
      addPaymentDto,
      req.user.userId,
    );
  }

  /**
   * GET /dashboard/global-counters
   * Returns data items required to paint the top visual box summary statistics cards
   */
  @Get('global-counters')
  @ApiOperation({
    summary:
      'Retrieve overall lead processing counters and conversion analytics',
  })
  async getCounters() {
    return await this.adminService.getGlobalDashboardCounters();
  }

  /**
   * GET /dashboard/pipeline-stages
   * Returns data items required to build the progress bars loop
   */
  @Get('pipeline-stages')
  @ApiOperation({
    summary: 'Retrieve stage counters for custom horizontal progress charts',
  })
  async getStages() {
    return await this.adminService.getPipelineStagesBreakdown();
  }

  /**
   * GET /dashboard/payment-overview
   * Supplies real financial aggregate metrics for the dashboard's currency box elements
   */
  @Get('payment-overview')
  @ApiOperation({
    summary:
      'Retrieve absolute portfolio values, cash collection histories, and pending ledgers',
  })
  async getOverview() {
    return await this.adminService.getGlobalPaymentOverview();
  }

  /**
   * GET /dashboard/action-required
   * Supplies list segments to cleanly map the actionable widget view elements
   */
  @Get('action-required')
  @ApiOperation({
    summary:
      'Retrieve segmented attention lists limited to 5 records maximum per stage group',
  })
  async getActionList() {
    return await this.adminService.getActionRequiredList();
  }

  /**
   * GET /finance/ledger-summary
   * Supplies exact calculations to paint your four-column metric card block UI elements
   */
  @Get('ledger-summary')
  @ApiOperation({
    summary:
      'Retrieve comprehensive currency flows, unsettled balances, and paid audit ratios',
  })
  async getPaymentCounter() {
    return await this.adminService.getFinancesSummaryDashboard();
  }

  /**
   * GET /finance/deals-board
   * Populates list rows and upper horizontal tab count pills simultaneously
   * Example: /finance/deals-board?tab=in_progress&search=Ramesh
   */
  @Get('deals-board')
  @ApiOperation({
    summary:
      'Retrieve filterable customer records with structural financial payment details',
  })
  async getDealsBoard(@Query() query: GetDealsBoardDto) {
    return await this.adminService.getDealsBoardData(query);
  }
}
