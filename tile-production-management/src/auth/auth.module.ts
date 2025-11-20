import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './guard/auth/auth.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { HashModule } from 'src/common/hash/hash.module';
import { SessionModule } from 'src/session/session.module';

@Module({
    providers: [AuthService, AuthGuard],
    controllers: [AuthController],
    imports: [
        JwtModule.registerAsync({
            useFactory: (configService: ConfigService): JwtModuleOptions => {
                const JWT_ACCESS_SECRET = configService.get<string>('JWT_ACCESS_SECRET')
                const JWT_ACCESS_EXPIRES = configService.get<string>('JWT_ACCESS_EXPIRES')

                return {
                    global: true,
                    secret: JWT_ACCESS_SECRET,
                    signOptions: {
                        expiresIn: JWT_ACCESS_EXPIRES as any
                    }
                }
            },
            inject: [ConfigService]
        }),
        UsersModule,
        HashModule,
        SessionModule,
        ConfigModule,
    ],
    exports: [
        JwtModule,
        UsersModule,
        AuthGuard
    ]
})
export class AuthModule { }
