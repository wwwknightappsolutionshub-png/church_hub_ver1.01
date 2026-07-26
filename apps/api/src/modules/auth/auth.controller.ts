import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileAvatarDataDto } from './dto/profile-avatar-data.dto';
import {
  ForgotPasswordDto,
  RequestMagicLinkDto,
  ResetPasswordDto,
  ConsumeMagicLinkDto,
} from './dto/auth-link.dto';
import {
  Login2faVerifyDto,
  LoginDto,
  RegisterStartDto,
  RegisterVerifyDto,
} from './dto/register.dto';
import { Public } from './decorators';
import { TEST_ACCOUNTS, TEST_PASSWORD } from './test-accounts';
import { CurrentUser, AuthUser } from './current-user.decorator';
import { MembershipAccessService } from '../membership/membership-access.service';
import { ModuleAccessService } from '../access/module-access.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  defaultTenantModules,
  parseTenantModulesFromSettings,
} from '@church-hub/shared-types';
import { parseDepartmentModuleSettings } from '../../common/department-module-settings';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly membershipAccess: MembershipAccessService,
    private readonly moduleAccess: ModuleAccessService,
    private readonly uploads: UploadsService,
  ) {}

  @Public()
  @Get('test-accounts')
  @ApiOperation({ summary: 'List magic-login test accounts (development only)' })
  testAccounts() {
    if (process.env.NODE_ENV === 'production' || process.env.DISABLE_TEST_ACCOUNTS === 'true') {
      throw new NotFoundException();
    }
    return {
      password: TEST_PASSWORD,
      accounts: TEST_ACCOUNTS,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register/start')
  @ApiOperation({ summary: 'Start tenant signup — emails a 6-digit OTP' })
  registerStart(@Body() body: RegisterStartDto) {
    return this.authService.startRegistration(body);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register/verify')
  @ApiOperation({ summary: 'Verify signup OTP and create church workspace' })
  registerVerify(@Body() body: RegisterVerifyDto) {
    return this.authService.verifyRegistration(body.registrationId, body.otp);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({
    summary: 'Start registration (OTP required — same as /register/start)',
    deprecated: true,
  })
  register(@Body() body: RegisterStartDto) {
    return this.authService.startRegistration(body);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('login')
  @ApiOperation({
    summary:
      'Login with email and password (ADMIN/PASTOR/PLATFORM_ADMIN receive email OTP challenge)',
  })
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login/2fa')
  @ApiOperation({
    summary: 'Verify login email OTP for ADMIN/PASTOR/PLATFORM_ADMIN and issue tokens',
  })
  login2fa(@Body() body: Login2faVerifyDto) {
    return this.authService.verifyLogin2fa(body.challengeId, body.otp);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Email a one-time password reset link' })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @ApiOperation({ summary: 'Set a new password using a reset token from email' })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPasswordWithToken(body.token, body.newPassword);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('magic-link')
  @ApiOperation({ summary: 'Email a one-time magic sign-in link' })
  requestMagicLink(@Body() body: RequestMagicLinkDto) {
    return this.authService.requestMagicLink(body.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('magic-link/consume')
  @ApiOperation({
    summary:
      'Exchange a magic sign-in token for session tokens (or email OTP challenge for ADMIN/PASTOR/PLATFORM_ADMIN)',
  })
  consumeMagicLink(@Body() body: ConsumeMagicLinkDto) {
    return this.authService.consumeMagicLink(body.token);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Revoke refresh token' })
  logout(@Body() body: { refreshToken: string }) {
    return this.authService.logout(body.refreshToken);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (required after temporary password login)' })
  changePassword(@CurrentUser() user: AuthUser, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(
      user.userId,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Patch('account')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile (name, nickname, avatar, phone)' })
  updateAccount(@CurrentUser() user: AuthUser, @Body() body: UpdateAccountDto) {
    return this.authService.updateAccount(user.userId, body);
  }

  @Post('profile-avatar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload profile photo (gallery or camera)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  uploadProfileAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Choose a photo from your gallery or camera');
    }
    return this.uploads.saveProfileAvatar(user.userId, file);
  }

  @Post('profile-avatar-data')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload profile photo as base64 data URL (gallery/camera fallback)' })
  uploadProfileAvatarData(
    @CurrentUser() user: AuthUser,
    @Body() body: ProfileAvatarDataDto,
  ) {
    return this.uploads.saveProfileAvatarDataUrl(user.userId, body.imageDataUrl);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user, member profile, and membership permissions' })
  async me(@CurrentUser() user: AuthUser) {
    const [membership, access, church, accountUser] = await Promise.all([
      this.membershipAccess.getSessionContext(user.userId, user.churchId),
      this.moduleAccess.getAccessFlags(user.userId, user.churchId),
      this.membershipAccess.getChurchSummary(user.churchId),
      this.authService.findActiveUserAccount(user.userId),
    ]);
    const member = membership.member;
    const baseUser = membership.user;
    const mergedUser =
      baseUser && member
        ? {
            ...baseUser,
            firstName: member.firstName ?? baseUser.firstName,
            lastName: member.lastName ?? baseUser.lastName,
            nickname: member.nickname ?? baseUser.nickname,
            phone: baseUser.phone ?? member.phone ?? null,
            avatarUrl: baseUser.avatarUrl ?? member.avatarUrl ?? null,
          }
        : baseUser;

    const isPlatformAdmin = access.isPlatformAdmin;

    const enabledModules = isPlatformAdmin
      ? defaultTenantModules()
      : church
        ? parseTenantModulesFromSettings(church.settings)
        : defaultTenantModules();
    const departmentModuleSettings =
      isPlatformAdmin || !church ? parseDepartmentModuleSettings({}) : parseDepartmentModuleSettings(church.settings);

    return {
      ...membership,
      ...access,
      user: isPlatformAdmin ? membership.user : mergedUser,
      member: isPlatformAdmin ? null : member,
      churchId: isPlatformAdmin ? null : user.churchId,
      churchName: isPlatformAdmin ? null : (church?.name ?? null),
      churchSlug: isPlatformAdmin ? null : (church?.slug ?? null),
      enabledModules,
      departmentModuleSettings,
      mustChangePassword: accountUser?.mustChangePassword ?? false,
    };
  }
}
