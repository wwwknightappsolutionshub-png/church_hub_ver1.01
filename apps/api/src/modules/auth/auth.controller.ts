import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileAvatarDataDto } from './dto/profile-avatar-data.dto';
import {
  ForgotPasswordDto,
  RequestMagicLinkDto,
  ResetPasswordDto,
  ConsumeMagicLinkDto,
  PasswordResetTokenDto,
} from './dto/auth-link.dto';
import { LoginDto, Login2faVerifyDto, RegisterStartDto, RegisterVerifyDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
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
import { AuthAccessGuard } from './auth-access.guard';
import { AuthAccessScope } from './auth-access-scope.decorator';
import { clientIpFromRequest } from './auth-client-ip.util';

function authCtx(req: Request) {
  return { clientIp: clientIpFromRequest(req) };
}

@ApiTags('auth')
@Controller('auth')
@UseGuards(AuthAccessGuard)
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
  @AuthAccessScope('register-start')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register/start')
  @ApiOperation({ summary: 'Start tenant signup — emails a 6-digit OTP' })
  registerStart(@Body() body: RegisterStartDto) {
    return this.authService.startRegistration(body);
  }

  @Public()
  @AuthAccessScope('register-verify')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('register/verify')
  @ApiOperation({ summary: 'Verify signup OTP and create church workspace' })
  registerVerify(@Req() req: Request, @Body() body: RegisterVerifyDto) {
    return this.authService.verifyRegistration(body.registrationId, body.otp, authCtx(req));
  }

  @Public()
  @AuthAccessScope('register-start')
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
  @AuthAccessScope('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @ApiOperation({
    summary:
      'Login with email and password (ADMIN/PASTOR/PLATFORM_ADMIN receive email OTP challenge)',
  })
  login(@Req() req: Request, @Body() body: LoginDto) {
    return this.authService.login(body.email, body.password, authCtx(req));
  }

  @Public()
  @AuthAccessScope('login-2fa')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('login/2fa')
  @ApiOperation({
    summary: 'Verify login email OTP for ADMIN/PASTOR/PLATFORM_ADMIN and issue tokens',
  })
  login2fa(@Req() req: Request, @Body() body: Login2faVerifyDto) {
    return this.authService.verifyLogin2fa(body.challengeId, body.otp, authCtx(req));
  }

  @Public()
  @AuthAccessScope('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Email a one-time password reset link' })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Public()
  @AuthAccessScope('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @ApiOperation({ summary: 'Set a new password using a reset token from email' })
  resetPassword(@Req() req: Request, @Body() body: ResetPasswordDto) {
    return this.authService.resetPasswordWithToken(body.token, body.newPassword, authCtx(req));
  }

  @Public()
  @AuthAccessScope('reset-validate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('reset-password/validate')
  @ApiOperation({ summary: 'Validate a password reset/setup token without consuming it' })
  validateResetPassword(@Req() req: Request, @Body() body: PasswordResetTokenDto) {
    return this.authService.validatePasswordResetToken(body.token, authCtx(req));
  }

  @Public()
  @AuthAccessScope('reset-resend')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('reset-password/resend')
  @ApiOperation({
    summary: 'Request a new set-password link from an expired or used reset token',
  })
  resendResetPassword(@Body() body: PasswordResetTokenDto) {
    return this.authService.resendPasswordSetupFromToken(body.token);
  }

  @Public()
  @AuthAccessScope('magic-link')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('magic-link')
  @ApiOperation({ summary: 'Email a one-time magic sign-in link' })
  requestMagicLink(@Body() body: RequestMagicLinkDto) {
    return this.authService.requestMagicLink(body.email);
  }

  @Public()
  @AuthAccessScope('magic-consume')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('magic-link/consume')
  @ApiOperation({
    summary:
      'Exchange a magic sign-in token for session tokens (or email OTP challenge for ADMIN/PASTOR/PLATFORM_ADMIN)',
  })
  consumeMagicLink(@Req() req: Request, @Body() body: ConsumeMagicLinkDto) {
    return this.authService.consumeMagicLink(body.token, authCtx(req));
  }

  @Public()
  @AuthAccessScope('refresh')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Req() req: Request, @Body() body: RefreshTokenDto) {
    return this.authService.refresh(body.refreshToken, authCtx(req));
  }

  @Public()
  @AuthAccessScope('logout')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('logout')
  @ApiOperation({ summary: 'Revoke refresh token' })
  logout(@Req() req: Request, @Body() body: RefreshTokenDto) {
    const authorization = req.headers.authorization;
    return this.authService.logout(
      body.refreshToken,
      typeof authorization === 'string' ? authorization : undefined,
    );
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

    const isPlatformOperator = access.isPlatformOperator || access.isPlatformAdmin;

    const enabledModules = isPlatformOperator
      ? defaultTenantModules()
      : church
        ? parseTenantModulesFromSettings(church.settings)
        : defaultTenantModules();
    const departmentModuleSettings =
      isPlatformOperator || !church ? parseDepartmentModuleSettings({}) : parseDepartmentModuleSettings(church.settings);

    return {
      ...membership,
      ...access,
      user: isPlatformOperator ? membership.user : mergedUser,
      member: isPlatformOperator ? null : member,
      churchId: isPlatformOperator ? null : user.churchId,
      churchName: isPlatformOperator ? null : (church?.name ?? null),
      churchSlug: isPlatformOperator ? null : (church?.slug ?? null),
      enabledModules,
      departmentModuleSettings,
      mustChangePassword: accountUser?.mustChangePassword ?? false,
    };
  }
}