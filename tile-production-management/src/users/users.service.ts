import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_PROVIDER } from 'src/common/redis/redis.constant';

interface RolesPermissionsCacheEntry {
    roles: string[];
    permissions: string[];
    expiresAt: number;
}

@Injectable()
export class UsersService {
    @InjectRepository(User)
    private userRepository: Repository<User>

    constructor(
        @Inject(REDIS_PROVIDER) private readonly redis: Redis,
    ) { }

    private readonly rolesPermissionsCache = new Map<string, RolesPermissionsCacheEntry>()
    private readonly CACHE_TTL_MS = 300_000 // 5p

    private rolesPermissionsCacheKey(userId: string) {
        return `user_roles_permissions:${userId}`
    }

    private getRolesPermissionsFromMemory(userId: string) {
        const entry = this.rolesPermissionsCache.get(userId)
        if (!entry) return null
        if (entry.expiresAt <= Date.now()) {
            this.rolesPermissionsCache.delete(userId)
            return null
        }
        return { roles: entry.roles, permissions: entry.permissions }
    }

    private async getRolesPermissionsFromRedis(userId: string) {
        const key = this.rolesPermissionsCacheKey(userId)
        const raw = await this.redis.get(key)
        if (!raw) return null
        try {
            const parsed = JSON.parse(raw) as { roles: string[]; permissions: string[] }
            this.rolesPermissionsCache.set(userId, {
                roles: parsed.roles ?? [],
                permissions: parsed.permissions ?? [],
                expiresAt: Date.now() + this.CACHE_TTL_MS,
            })
            return parsed
        } catch {
            await this.redis.del(key)
            return null
        }
    }

    private async setRolesPermissionsCache(userId: string, data: { roles: string[]; permissions: string[] }) {
        const key = this.rolesPermissionsCacheKey(userId)
        const payload = JSON.stringify(data)
        this.rolesPermissionsCache.set(userId, {
            roles: data.roles,
            permissions: data.permissions,
            expiresAt: Date.now() + this.CACHE_TTL_MS,
        })
        await this.redis.set(key, payload, 'EX', Math.ceil(this.CACHE_TTL_MS / 1000))
    }

    // CREATE
    // async create(createUserDTO: CreateUserDTO) {
    //     const { email, password, username } = createUserDTO
    //     const passwordHash = await this.hasher.hash(password)

    //     const newUser = await this.userRepository.create({
    //         email: email.toLowerCase(),
    //         username: username.toLowerCase(),
    //         passwordHash
    //     })

    //     return await this.userRepository.save(newUser)
    // }


    // READ
    async findOne(id: string) {
        return await this.userRepository.findOne({
            where: {
                id
            },
            select: {
                passwordHash: false
            }
        })
    }

    async findOneByUsername(username: string) {
        return await this.userRepository.findOne({
            where: {
                username
            },
            // cần passwordHash để login
        })
    }

    async findOneByEmail(email: string) {
        return await this.userRepository.findOne({
            where: {
                email
            },
            // cần passwordHash để login
        })
    }

    // PERMISSION
    async findUserPermissions(userId: string): Promise<string[]> {
        const { permissions } = await this.findUserRolesAndPermissions(userId)
        return permissions
    }

    async findUserRolesAndPermissions(userId: string): Promise<{ roles: string[]; permissions: string[] }> {
        const fromMemory = this.getRolesPermissionsFromMemory(userId)
        if (fromMemory) {
            return fromMemory
        }

        const fromRedis = await this.getRolesPermissionsFromRedis(userId)
        if (fromRedis) {
            return fromRedis
        }

        const user = await this.userRepository.findOne({
            where: {
                id: userId
            },
            select: {
                passwordHash: false
            },
            relations: ['roles', 'roles.permissions'],
        })

        if (!user || !user.roles) {
            const empty = { roles: [], permissions: [] as string[] }
            await this.setRolesPermissionsCache(userId, empty)
            return empty
        }

        const roles = user.roles.map(role => role.slug)
        const permissionSet = new Set<string>()

        for (const role of user.roles) {
            if (!role.permissions) continue
            for (const permission of role.permissions) {
                if (permission?.code) {
                    permissionSet.add(permission.code)
                }
            }
        }

        const result = {
            roles,
            permissions: Array.from(permissionSet)
        }

        await this.setRolesPermissionsCache(userId, result)
        return result
    }
}       
