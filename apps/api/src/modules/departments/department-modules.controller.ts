import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { MembershipImportColumnMapping, MembershipImportOptions } from '@church-hub/shared-types';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ModuleGate } from '../auth/decorators';
import { DepartmentModulesService } from './department-modules.service';
import { ChildrenDepartmentService } from './children-department.service';
import { ChildrenMinistryService } from './children-ministry.service';
import {
  AssignChildrenClassDto,
  AddChildrenTeacherDto,
  ChildrenSendRemindersDto,
  ChildrenSundayReportDto,
  CreateChildrenClassReportDto,
  CreateChildrenClassDefinitionDto,
  CreateChildrenCurriculumDto,
  RegisterChildWizardDto,
  UpdateChildrenClassDefinitionDto,
  SimplifyChildrenCurriculumDto,
  UploadChildrenCurriculumMetaDto,
  UpsertChildrenRosterDto,
} from './children.dto';
import { MedicalDepartmentService } from './medical-department.service';
import { ChoirDepartmentService } from './choir-department.service';
import { PrayerDepartmentService } from './prayer-department.service';
import {
  AddChoirSetlistItemDto,
  BulkChoirAttendanceDto,
  ChoirSendRemindersDto,
  ChoirSongFeedbackDto,
  CreateChoirSetlistDto,
  CreateChoirVocalNoteDto,
  TransposeChoirSongDto,
  UploadChoirAuditionMetaDto,
  UploadChoirSongAssetMetaDto,
  UpsertChoirAttendanceDto,
  UpsertChoirAuditionDto,
  UpsertChoirRosterDto,
  UpsertChoirSongDto,
  UpsertChoirVoiceTaskDto,
} from './choir.dto';
import {
  BulkPrayerScheduleAttendanceDto,
  CreatePrayerIntakeDto,
  CreatePrayerProgressNoteDto,
  UpdatePrayerIntakeDto,
  UpsertPrayerAssignmentDto,
  UpsertPrayerScheduleDto,
  UpsertPrayerScriptureDto,
} from './prayer.dto';

@ApiTags('department-modules')
@ApiBearerAuth()
@ModuleGate('serviceUnitHub')
@Controller('service-units/:unitId/dept-tools')
export class DepartmentModulesController {
  constructor(
    private readonly dept: DepartmentModulesService,
    private readonly medical: MedicalDepartmentService,
    private readonly children: ChildrenDepartmentService,
    private readonly childrenMinistry: ChildrenMinistryService,
    private readonly choir: ChoirDepartmentService,
    private readonly prayer: PrayerDepartmentService,
  ) {}

  @Get('context')
  @ApiOperation({ summary: 'Department module context + RBAC flags' })
  context(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.getContext(user.userId, churchId, unitId);
  }

  @Get('dashboard')
  dashboard(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.getDashboard(user.userId, churchId, unitId);
  }

  @Get('schedules')
  listSchedules(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.listSchedules(user.userId, churchId, unitId);
  }

  @Post('schedules')
  createSchedule(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['createSchedule']>[3],
  ) {
    return this.dept.createSchedule(user.userId, churchId, unitId, body);
  }

  @Delete('schedules/:scheduleId')
  deleteSchedule(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.dept.deleteSchedule(user.userId, churchId, unitId, scheduleId);
  }

  @Get('assignments')
  listAssignments(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.listAssignments(user.userId, churchId, unitId);
  }

  @Post('assignments')
  upsertAssignment(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['upsertAssignment']>[3],
  ) {
    return this.dept.upsertAssignment(user.userId, churchId, unitId, body);
  }

  @Delete('assignments/:assignmentId')
  deleteAssignment(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.dept.deleteAssignment(user.userId, churchId, unitId, assignmentId);
  }

  @Get('inventory')
  listInventory(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.listInventory(user.userId, churchId, unitId);
  }

  @Post('inventory')
  upsertInventory(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['upsertInventory']>[3],
  ) {
    return this.dept.upsertInventory(user.userId, churchId, unitId, body);
  }

  @Get('resources')
  listResources(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('category') category?: string,
  ) {
    return this.dept.listResources(user.userId, churchId, unitId, category);
  }

  @Post('resources')
  createResource(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['createResource']>[3],
  ) {
    return this.dept.createResource(user.userId, churchId, unitId, body);
  }

  @Get('tasks')
  listTasks(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.listTasks(user.userId, churchId, unitId);
  }

  @Post('tasks')
  upsertTask(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['upsertTask']>[3],
  ) {
    return this.dept.upsertTask(user.userId, churchId, unitId, body);
  }

  @Get('incidents')
  listIncidents(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.listIncidents(user.userId, churchId, unitId);
  }

  @Post('incidents')
  createIncident(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['createIncident']>[3],
  ) {
    return this.dept.createIncident(user.userId, churchId, unitId, body);
  }

  @Patch('incidents/:incidentId')
  @ApiOperation({ summary: 'Update medical incident (recovery / resolve)' })
  updateMedicalIncident(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('incidentId') incidentId: string,
    @Body() body: Parameters<MedicalDepartmentService['updateIncident']>[4],
  ) {
    return this.medical.updateIncident(user.userId, churchId, unitId, incidentId, body);
  }

  @Get('medical/catalog')
  medicalCatalog() {
    return this.medical.getCatalog();
  }

  @Get('medical/team-attendance')
  listMedicalTeamAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.medical.listTeamAttendance(user.userId, churchId, unitId);
  }

  @Post('medical/team-attendance')
  logMedicalTeamAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<MedicalDepartmentService['logTeamAttendance']>[3],
  ) {
    return this.medical.logTeamAttendance(user.userId, churchId, unitId, body);
  }

  @Post('medical/notify-absentees')
  @ApiOperation({ summary: 'Notify medical team absentees for a service date' })
  medicalNotifyAbsentees(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: { serviceDate?: string },
  ) {
    return this.medical.notifyAbsentees(user.userId, churchId, unitId, body.serviceDate);
  }

  @Post('medical/weekly-report')
  @ApiOperation({ summary: 'Generate medical weekly report to admin/pastor' })
  medicalWeeklyReport(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.medical.generateWeeklyReport(user.userId, churchId, unitId);
  }

  @Get('children/catalog')
  childrenCatalog(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.children.getCatalog(user.userId, churchId, unitId);
  }

  @Get('children/classes')
  @ApiOperation({ summary: 'List Children\'s Church age/class groups for this unit' })
  listChildrenClasses(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.childrenMinistry.listClassDefinitions(user.userId, churchId, unitId, {
      includeInactive: includeInactive === 'true',
    });
  }

  @Post('children/classes')
  @ApiOperation({ summary: 'Create a Children\'s Church class (church admin / children admin)' })
  createChildrenClass(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: CreateChildrenClassDefinitionDto,
  ) {
    return this.childrenMinistry.createClassDefinition(user.userId, churchId, unitId, body);
  }

  @Patch('children/classes/:classId')
  @ApiOperation({ summary: 'Update a Children\'s Church class' })
  updateChildrenClass(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('classId') classId: string,
    @Body() body: UpdateChildrenClassDefinitionDto,
  ) {
    return this.childrenMinistry.updateClassDefinition(user.userId, churchId, unitId, classId, body);
  }

  @Get('children/roster')
  @ApiOperation({ summary: 'Weekly teacher duty roster by age class' })
  listChildrenRoster(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.children.listRoster(user.userId, churchId, unitId, weekStart);
  }

  @Post('children/roster')
  upsertChildrenRoster(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: UpsertChildrenRosterDto,
  ) {
    return this.children.upsertRoster(user.userId, churchId, unitId, body);
  }

  @Delete('children/roster/:rosterId')
  deleteChildrenRoster(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('rosterId') rosterId: string,
  ) {
    return this.children.deleteRoster(user.userId, churchId, unitId, rosterId);
  }

  @Post('children/send-reminders')
  @ApiOperation({ summary: 'Send automated teaching duty reminders for the week' })
  childrenSendReminders(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body?: ChildrenSendRemindersDto,
  ) {
    return this.children.sendRosterReminders(user.userId, churchId, unitId, body);
  }

  @Get('children/curriculum')
  listChildrenCurriculum(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('weekStart') weekStart?: string,
    @Query('source') source?: string,
  ) {
    return this.children.listCurriculum(user.userId, churchId, unitId, { weekStart, source });
  }

  @Post('children/curriculum')
  createChildrenCurriculum(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: CreateChildrenCurriculumDto,
  ) {
    return this.children.createCurriculum(user.userId, churchId, unitId, body);
  }

  @Post('children/curriculum/upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload custom teaching PDF' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  uploadChildrenCurriculum(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadChildrenCurriculumMetaDto,
  ) {
    if (!file) {
      throw new BadRequestException('Choose a PDF file to upload');
    }
    return this.children.uploadCurriculumPdf(user.userId, churchId, unitId, file, body);
  }

  @Post('children/curriculum/:curriculumId/simplify')
  @ApiOperation({ summary: 'AI-assisted lesson simplification for age group' })
  simplifyChildrenCurriculum(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('curriculumId') curriculumId: string,
    @Body() body: SimplifyChildrenCurriculumDto,
  ) {
    return this.children.simplifyCurriculum(user.userId, churchId, unitId, curriculumId, body);
  }

  @Get('children/reports')
  listChildrenClassReports(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.children.listClassReports(user.userId, churchId, unitId, { from, to });
  }

  @Post('children/reports')
  createChildrenClassReport(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: CreateChildrenClassReportDto,
  ) {
    return this.children.createClassReport(user.userId, churchId, unitId, body);
  }

  @Get('children/access')
  @ApiOperation({ summary: 'Children\'s Church leadership access flags' })
  childrenMinistryAccess(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.childrenMinistry.getAccess(user.userId, churchId, unitId);
  }

  @Get('children/children')
  @ApiOperation({ summary: 'Paginated Children\'s Church roster' })
  listChildrenMinistryChildren(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.childrenMinistry.listChildren(user.userId, churchId, unitId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('children/children/:childId')
  @ApiOperation({ summary: 'Child detail with parent connection tree' })
  getChildrenMinistryChild(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('childId') childId: string,
  ) {
    return this.childrenMinistry.getChildDetail(user.userId, churchId, unitId, childId);
  }

  @Get('children/parents')
  @ApiOperation({ summary: 'Parents linked to Children\'s Church children' })
  listChildrenMinistryParents(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.childrenMinistry.listParents(user.userId, churchId, unitId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('children/teachers')
  @ApiOperation({ summary: 'Teachers and Children Church admins' })
  listChildrenMinistryTeachers(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.childrenMinistry.listTeachers(user.userId, churchId, unitId);
  }

  @Post('children/teachers')
  @ApiOperation({ summary: 'Add teacher to Children\'s Church team (unit + ministry tag)' })
  addChildrenMinistryTeacher(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: AddChildrenTeacherDto,
  ) {
    return this.childrenMinistry.addTeacher(user.userId, churchId, unitId, body);
  }

  @Get('children/birthdays')
  @ApiOperation({ summary: 'Upcoming children\'s birthdays' })
  listChildrenMinistryBirthdays(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('days') days?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.childrenMinistry.listBirthdays(user.userId, churchId, unitId, {
      days: days ? Number(days) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('children/enrollments/:childId')
  @ApiOperation({ summary: 'Assign child to a class group' })
  assignChildrenClass(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('childId') childId: string,
    @Body() body: AssignChildrenClassDto,
  ) {
    return this.childrenMinistry.assignClass(
      user.userId,
      churchId,
      unitId,
      childId,
      body.classGroup,
    );
  }

  @Get('children/registration/catalog')
  @ApiOperation({ summary: 'Family form catalog and household list for child registration' })
  childrenRegistrationCatalog(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.childrenMinistry.getRegistrationCatalog(user.userId, churchId, unitId);
  }

  @Get('children/registration/families')
  @ApiOperation({ summary: 'Search families by surname for child registration' })
  searchChildrenRegistrationFamilies(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('search') search?: string,
  ) {
    return this.childrenMinistry.searchRegistrationFamilies(
      user.userId,
      churchId,
      unitId,
      search,
    );
  }

  @Get('children/registration/guardians')
  @ApiOperation({ summary: 'Search members to link as parents/guardians' })
  searchChildrenRegistrationGuardians(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('search') search?: string,
  ) {
    return this.childrenMinistry.searchRegistrationGuardians(
      user.userId,
      churchId,
      unitId,
      search,
    );
  }

  @Post('children/registration/submit')
  @ApiOperation({ summary: 'Register a child via the 3-step wizard (personal, family tree, preview)' })
  submitChildrenRegistrationWizard(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: RegisterChildWizardDto,
  ) {
    return this.childrenMinistry.registerChildWizard(user.userId, churchId, unitId, body);
  }

  @Post('children/registration/families')
  @ApiOperation({ summary: 'Create household via family form (Children\'s Church teachers/admins)' })
  createChildrenRegistrationFamily(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body()
    body: {
      name: string;
      headMemberId?: string;
      address?: string;
      address2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      homePhone?: string;
      email?: string;
      homeCell?: string;
      specialOccasion?: string;
      specialOccasionDate?: string;
      customFields?: Record<string, string | boolean | null>;
      propertyIds?: string[];
    },
  ) {
    return this.childrenMinistry.createFamilyForRegistration(
      user.userId,
      churchId,
      unitId,
      body,
    );
  }

  @Post('children/registration/members')
  @ApiOperation({ summary: 'Register a child member tagged for Children\'s Church' })
  registerChildrenMember(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.childrenMinistry.registerChildMember(user.userId, churchId, unitId, body);
  }

  @Get('children/registration/import/template.csv')
  @ApiOperation({ summary: 'Download CSV template for bulk child registration' })
  childrenImportTemplate(@Res() res: Response) {
    const csv = this.childrenMinistry.getChildrenImportTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="churchhub-children-import-template.csv"',
    );
    res.send(csv);
  }

  @Post('children/registration/import/upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload CSV for bulk child registration' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadChildrenImport(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.childrenMinistry.uploadChildrenImport(user.userId, churchId, unitId, file);
  }

  @Post('children/registration/import/preview')
  @ApiOperation({ summary: 'Preview bulk child import mapping' })
  previewChildrenImport(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body()
    body: {
      jobId: string;
      columnMapping: MembershipImportColumnMapping;
      options?: MembershipImportOptions;
    },
  ) {
    return this.childrenMinistry.previewChildrenImport(
      user.userId,
      churchId,
      unitId,
      body.jobId,
      body.columnMapping,
      body.options,
    );
  }

  @Post('children/registration/import/commit')
  @ApiOperation({ summary: 'Commit bulk child import and tag for Children\'s Church' })
  commitChildrenImport(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: { jobId: string },
  ) {
    return this.childrenMinistry.commitChildrenImport(
      churchId,
      unitId,
      body.jobId,
      user.userId,
    );
  }

  @Get('children/registration/import/jobs/:jobId')
  @ApiOperation({ summary: 'Get bulk child import job status' })
  getChildrenImportJob(
    @ChurchId() churchId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.childrenMinistry.getChildrenImportJob(churchId, jobId);
  }

  @Get('children/check-in-board')
  @ApiOperation({ summary: 'Pickup tracking board for today\'s session' })
  childrenCheckInBoard(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('serviceDate') serviceDate?: string,
  ) {
    return this.childrenMinistry.getCheckInBoard(user.userId, churchId, unitId, serviceDate);
  }

  @Post('children/sunday-report')
  @ApiOperation({ summary: 'Send Sunday head-count report to church admin and pastor (email + in-app)' })
  sendChildrenSundayReport(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: ChildrenSundayReportDto,
  ) {
    return this.childrenMinistry.sendSundayReport(user.userId, churchId, unitId, body);
  }

  @Post('children/birthdays/run')
  @ApiOperation({ summary: 'Queue parent birthday emails for children with birthdays today' })
  runChildrenBirthdayEmails(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.childrenMinistry.runBirthdayParentEmailsManual(user.userId, churchId, unitId);
  }

  @Get('choir/catalog')
  choirCatalog() {
    return this.choir.getCatalog();
  }

  @Get('choir/roster')
  listChoirRoster(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.choir.listRoster(user.userId, churchId, unitId, { from, to, eventType });
  }

  @Post('choir/roster')
  upsertChoirRoster(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: UpsertChoirRosterDto,
  ) {
    return this.choir.upsertRoster(user.userId, churchId, unitId, body);
  }

  @Delete('choir/roster/:rosterId')
  deleteChoirRoster(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('rosterId') rosterId: string,
  ) {
    return this.choir.deleteRoster(user.userId, churchId, unitId, rosterId);
  }

  @Post('choir/send-reminders')
  choirSendReminders(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body?: ChoirSendRemindersDto,
  ) {
    return this.choir.sendRosterReminders(user.userId, churchId, unitId, body);
  }

  @Get('choir/songs')
  listChoirSongs(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.choir.listSongs(user.userId, churchId, unitId);
  }

  @Post('choir/songs')
  upsertChoirSong(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: UpsertChoirSongDto,
  ) {
    return this.choir.upsertSong(user.userId, churchId, unitId, body);
  }

  @Post('choir/songs/:songId/transpose')
  transposeChoirSong(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('songId') songId: string,
    @Body() body: TransposeChoirSongDto,
  ) {
    return this.choir.transposeSong(user.userId, churchId, unitId, songId, body);
  }

  @Patch('choir/songs/:songId')
  patchChoirSong(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('songId') songId: string,
    @Body() body: UpsertChoirSongDto,
  ) {
    return this.choir.upsertSong(user.userId, churchId, unitId, { ...body, id: songId });
  }

  @Delete('choir/songs/:songId')
  deleteChoirSong(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('songId') songId: string,
  ) {
    return this.choir.deleteSong(user.userId, churchId, unitId, songId);
  }

  @Post('choir/songs/upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload choir song audio, sheet, or practice track' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024, files: 1 },
    }),
  )
  uploadChoirSongAsset(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadChoirSongAssetMetaDto,
  ) {
    if (!file) {
      throw new BadRequestException('Choose a file to upload');
    }
    return this.choir.uploadSongAsset(user.userId, churchId, unitId, file, body);
  }

  @Get('choir/setlists')
  listChoirSetlists(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.choir.listSetlists(user.userId, churchId, unitId);
  }

  @Post('choir/setlists')
  createChoirSetlist(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: CreateChoirSetlistDto,
  ) {
    return this.choir.createSetlist(user.userId, churchId, unitId, body);
  }

  @Post('choir/setlists/:setlistId/items')
  addChoirSetlistItem(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('setlistId') setlistId: string,
    @Body() body: AddChoirSetlistItemDto,
  ) {
    return this.choir.addSetlistItem(user.userId, churchId, unitId, setlistId, body);
  }

  @Post('choir/feedback')
  choirSongFeedback(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: ChoirSongFeedbackDto,
  ) {
    return this.choir.addSongFeedback(user.userId, churchId, unitId, body);
  }

  @Get('choir/attendance')
  listChoirAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.choir.listAttendance(user.userId, churchId, unitId, { from, to });
  }

  @Post('choir/attendance')
  upsertChoirAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: UpsertChoirAttendanceDto,
  ) {
    return this.choir.upsertAttendance(user.userId, churchId, unitId, body);
  }

  @Post('choir/attendance/bulk')
  bulkChoirAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: BulkChoirAttendanceDto,
  ) {
    return this.choir.bulkUpsertAttendance(user.userId, churchId, unitId, body);
  }

  @Patch('choir/attendance/:attendanceId')
  patchChoirAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('attendanceId') attendanceId: string,
    @Body() body: UpsertChoirAttendanceDto,
  ) {
    return this.choir.upsertAttendance(user.userId, churchId, unitId, {
      ...body,
      id: attendanceId,
    });
  }

  @Delete('choir/attendance/:attendanceId')
  deleteChoirAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('attendanceId') attendanceId: string,
  ) {
    return this.choir.deleteAttendance(user.userId, churchId, unitId, attendanceId);
  }

  @Post('choir/attendance/send-follow-ups')
  choirAttendanceFollowUps(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.choir.sendAttendanceFollowUps(user.userId, churchId, unitId);
  }

  @Get('choir/auditions')
  listChoirAuditions(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.choir.listAuditions(user.userId, churchId, unitId);
  }

  @Post('choir/auditions')
  upsertChoirAudition(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: UpsertChoirAuditionDto,
  ) {
    return this.choir.upsertAudition(user.userId, churchId, unitId, body);
  }

  @Patch('choir/auditions/:auditionId')
  patchChoirAudition(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('auditionId') auditionId: string,
    @Body() body: UpsertChoirAuditionDto,
  ) {
    return this.choir.upsertAudition(user.userId, churchId, unitId, { ...body, id: auditionId });
  }

  @Delete('choir/auditions/:auditionId')
  deleteChoirAudition(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('auditionId') auditionId: string,
  ) {
    return this.choir.deleteAudition(user.userId, churchId, unitId, auditionId);
  }

  @Post('choir/auditions/upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload audition recording' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024, files: 1 },
    }),
  )
  uploadChoirAuditionRecording(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadChoirAuditionMetaDto,
  ) {
    if (!file) {
      throw new BadRequestException('Choose an audio file to upload');
    }
    return this.choir.uploadAuditionRecording(user.userId, churchId, unitId, file, body);
  }

  @Get('choir/voice-tasks')
  listChoirVoiceTasks(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.choir.listVoiceTasks(user.userId, churchId, unitId);
  }

  @Post('choir/voice-tasks')
  upsertChoirVoiceTask(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: UpsertChoirVoiceTaskDto,
  ) {
    return this.choir.upsertVoiceTask(user.userId, churchId, unitId, body);
  }

  @Patch('choir/voice-tasks/:taskId')
  patchChoirVoiceTask(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('taskId') taskId: string,
    @Body() body: UpsertChoirVoiceTaskDto,
  ) {
    return this.choir.upsertVoiceTask(user.userId, churchId, unitId, { ...body, id: taskId });
  }

  @Delete('choir/voice-tasks/:taskId')
  deleteChoirVoiceTask(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.choir.deleteVoiceTask(user.userId, churchId, unitId, taskId);
  }

  @Get('choir/vocal-notes')
  listChoirVocalNotes(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.choir.listVocalNotes(user.userId, churchId, unitId);
  }

  @Post('choir/vocal-notes')
  createChoirVocalNote(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: CreateChoirVocalNoteDto,
  ) {
    return this.choir.createVocalNote(user.userId, churchId, unitId, body);
  }

  @Delete('choir/vocal-notes/:noteId')
  deleteChoirVocalNote(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.choir.deleteVocalNote(user.userId, churchId, unitId, noteId);
  }

  @Get('check-ins')
  listCheckIns(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.listCheckIns(user.userId, churchId, unitId);
  }

  @Post('check-ins')
  checkIn(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['checkInChild']>[3],
  ) {
    return this.dept.checkInChild(user.userId, churchId, unitId, body);
  }

  @Patch('check-ins/:checkInId/checkout')
  checkOut(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('checkInId') checkInId: string,
  ) {
    return this.dept.checkOutChild(user.userId, churchId, unitId, checkInId);
  }

  @Get('prayer/catalog')
  prayerCatalog() {
    return this.prayer.getCatalog();
  }

  @Get('prayer/assignments')
  listPrayerAssignments(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.prayer.listAssignments(user.userId, churchId, unitId, { weekStart });
  }

  @Post('prayer/assignments')
  upsertPrayerAssignment(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: UpsertPrayerAssignmentDto,
  ) {
    return this.prayer.upsertAssignment(user.userId, churchId, unitId, body);
  }

  @Delete('prayer/assignments/:assignmentId')
  deletePrayerAssignment(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.prayer.deleteAssignment(user.userId, churchId, unitId, assignmentId);
  }

  @Get('prayer/schedule')
  listPrayerSchedule(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.prayer.listSchedule(user.userId, churchId, unitId);
  }

  @Post('prayer/schedule')
  upsertPrayerSchedule(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: UpsertPrayerScheduleDto,
  ) {
    return this.prayer.upsertSchedule(user.userId, churchId, unitId, body);
  }

  @Delete('prayer/schedule/:sessionId')
  deletePrayerSchedule(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.prayer.deleteSchedule(user.userId, churchId, unitId, sessionId);
  }

  @Post('prayer/schedule/attendance/bulk')
  bulkPrayerScheduleAttendance(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: BulkPrayerScheduleAttendanceDto,
  ) {
    return this.prayer.bulkScheduleAttendance(user.userId, churchId, unitId, body);
  }

  @Get('prayer/intake')
  listPrayerIntake(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.prayer.listIntake(user.userId, churchId, unitId);
  }

  @Post('prayer/intake')
  createPrayerIntake(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: CreatePrayerIntakeDto,
  ) {
    return this.prayer.createIntake(user.userId, churchId, unitId, body);
  }

  @Patch('prayer/intake/:intakeId')
  patchPrayerIntake(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('intakeId') intakeId: string,
    @Body() body: UpdatePrayerIntakeDto,
  ) {
    return this.prayer.updateIntake(user.userId, churchId, unitId, intakeId, body);
  }

  @Delete('prayer/intake/:intakeId')
  deletePrayerIntake(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('intakeId') intakeId: string,
  ) {
    return this.prayer.deleteIntake(user.userId, churchId, unitId, intakeId);
  }

  @Post('prayer/intake/:intakeId/escalate')
  escalatePrayerIntake(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('intakeId') intakeId: string,
  ) {
    return this.prayer.escalateIntake(user.userId, churchId, unitId, intakeId);
  }

  @Get('prayer/progress')
  listPrayerProgress(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.prayer.listProgress(user.userId, churchId, unitId);
  }

  @Post('prayer/progress/notes')
  addPrayerProgressNote(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: CreatePrayerProgressNoteDto,
  ) {
    return this.prayer.addProgressNote(user.userId, churchId, unitId, body);
  }

  @Get('prayer/scripture')
  listPrayerScripture(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.prayer.listScripture(user.userId, churchId, unitId);
  }

  @Post('prayer/scripture')
  upsertPrayerScripture(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: UpsertPrayerScriptureDto,
  ) {
    return this.prayer.upsertScripture(user.userId, churchId, unitId, body);
  }

  @Delete('prayer/scripture/:guideId')
  deletePrayerScripture(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('guideId') guideId: string,
  ) {
    return this.prayer.deleteScripture(user.userId, churchId, unitId, guideId);
  }

  @Get('prayer-items')
  listPrayer(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.listPrayerItems(user.userId, churchId, unitId);
  }

  @Post('prayer-items')
  createPrayer(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['createPrayerItem']>[3],
  ) {
    return this.dept.createPrayerItem(user.userId, churchId, unitId, body);
  }

  @Patch('prayer-items/:prayerId')
  updatePrayer(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Param('prayerId') prayerId: string,
    @Body() body: Parameters<DepartmentModulesService['updatePrayerItem']>[4],
  ) {
    return this.dept.updatePrayerItem(user.userId, churchId, unitId, prayerId, body);
  }

  @Get('skills')
  listSkills(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.listSkills(user.userId, churchId, unitId);
  }

  @Post('skills')
  addSkill(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['addSkill']>[3],
  ) {
    return this.dept.addSkill(user.userId, churchId, unitId, body);
  }

  @Get('songs')
  listSongs(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.listSongs(user.userId, churchId, unitId);
  }

  @Post('songs')
  upsertSong(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['upsertSong']>[3],
  ) {
    return this.dept.upsertSong(user.userId, churchId, unitId, body);
  }

  @Get('certifications')
  listCerts(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.listCertifications(user.userId, churchId, unitId);
  }

  @Post('certifications')
  addCert(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['addCertification']>[3],
  ) {
    return this.dept.addCertification(user.userId, churchId, unitId, body);
  }

  @Get('progress-notes')
  listNotes(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.listProgressNotes(user.userId, churchId, unitId);
  }

  @Post('progress-notes')
  addNote(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['addProgressNote']>[3],
  ) {
    return this.dept.addProgressNote(user.userId, churchId, unitId, body);
  }

  @Get('checklist')
  getChecklist(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Query('date') date: string,
  ) {
    return this.dept.getChecklist(
      user.userId,
      churchId,
      unitId,
      date || new Date().toISOString().slice(0, 10),
    );
  }

  @Post('checklist')
  toggleChecklist(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['toggleChecklist']>[3],
  ) {
    return this.dept.toggleChecklist(user.userId, churchId, unitId, body);
  }

  @Get('follow-ups')
  listFollowUps(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.listFollowUps(user.userId, churchId, unitId);
  }

  @Post('follow-ups')
  addFollowUp(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['addFollowUp']>[3],
  ) {
    return this.dept.addFollowUp(user.userId, churchId, unitId, body);
  }

  @Get('reports')
  listReports(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.listReports(user.userId, churchId, unitId);
  }

  @Post('reports')
  submitReport(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['submitReport']>[3],
  ) {
    return this.dept.submitReport(user.userId, churchId, unitId, body);
  }

  @Post('reports/quick')
  submitQuickReport(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.submitQuickReport(user.userId, churchId, unitId);
  }

  @Get('feedbacks')
  listFeedbacks(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
  ) {
    return this.dept.listFeedbacks(user.userId, churchId, unitId);
  }

  @Post('feedbacks')
  createFeedback(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: import('./dto/create-dept-feedback.dto').CreateDeptFeedbackDto,
  ) {
    return this.dept.createFeedback(user.userId, churchId, unitId, body);
  }

  @Post('alerts')
  sendAlert(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('unitId') unitId: string,
    @Body() body: Parameters<DepartmentModulesService['sendAlert']>[3],
  ) {
    return this.dept.sendAlert(user.userId, churchId, unitId, body);
  }
}
