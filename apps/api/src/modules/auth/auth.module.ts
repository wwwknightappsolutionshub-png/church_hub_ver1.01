import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { MemberAdminGuard } from './member-admin.guard';
import { MembershipModule } from '../membership/membership.module';
import { UploadsModule } from '../uploads/uploads.module';
import { FollowUpAccessGuard } from './follow-up-access.guard';
import { ModuleAccessGuard } from './module-access.guard';
import { PlatformModule } from '../platform/platform.module';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [
    MembershipModule,
    UploadsModule,
    CacheModule,
    forwardRef(() => PlatformModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: MemberAdminGuard },
    { provide: APP_GUARD, useClass: FollowUpAccessGuard },
    { provide: APP_GUARD, useClass: ModuleAccessGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
