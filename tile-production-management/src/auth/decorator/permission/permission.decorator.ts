import { SetMetadata } from '@nestjs/common';


export const REQUIRED_PERMISSION_DECORATOR = 'permission'
export const Permission = (...args: string[]) => SetMetadata(REQUIRED_PERMISSION_DECORATOR, args);
