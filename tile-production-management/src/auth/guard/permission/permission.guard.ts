import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRED_PERMISSION_DECORATOR } from 'src/auth/decorator/permission/permission.decorator';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private userService: UsersService
    ) { }
    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {
        const requiredPermission =
            this.reflector.get<string[] | undefined>(REQUIRED_PERMISSION_DECORATOR, context.getHandler()) ||
            this.reflector.get<string[] | undefined>(REQUIRED_PERMISSION_DECORATOR, context.getClass())

        // If route doesn't define required permissions, allow access
        if (!requiredPermission || requiredPermission.length === 0) {
            return true
        }

        const request: Request = context.switchToHttp().getRequest()
        const user = (request as any).user

        if (!user) {
            throw new ForbiddenException('User context not found')
        }

        const { id } = user
        //1. get user's permissions
        const userPermissions = await this.userService.findUserPermissions(id)
        //2. compare user permissions
        const hasPermission = requiredPermission.some((permission) =>
            userPermissions.includes(permission),
        )

        if (!hasPermission) {
            throw new ForbiddenException('Permission denied')
        }
        return true
    }
}
