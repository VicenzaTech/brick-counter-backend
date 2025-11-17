import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt'
import { HASH_PROVIDER } from './hash.constant';
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: HASH_PROVIDER,
            useFactory: (configService: ConfigService) => {
                // const hash_round = configService.get<number>('HASH_ROUNDS') ?? '12'
                const hash_round = 12
                const salt = bcrypt.genSaltSync(hash_round)
                return {
                    hash: async (text: string) => {
                        return await bcrypt.hash(text, salt)
                    },
                    compare: async (text: string, encText: string) => { return await bcrypt.compare(text, encText) }
                }
            },
            inject: [ConfigService]
        }
    ],
    exports: [
        HASH_PROVIDER
    ]
})
export class HashModule { }
