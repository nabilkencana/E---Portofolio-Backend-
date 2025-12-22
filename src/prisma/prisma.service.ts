// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            log: ['error', 'warn'],
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
        });
    }

    async onModuleInit() {
        // JANGAN gunakan $connect() atau $queryRaw() di sini
        // Biarkan Prisma connect secara lazy
        console.log('Prisma service initialized');
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    // Method untuk bypass prepared statements
    async rawQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
        // Gunakan client pool manual untuk menghindari prepared statement cache
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 1, // Limit connection untuk testing
            idleTimeoutMillis: 30000,
        });

        try {
            const client = await pool.connect();
            try {
                const result = await client.query(query, params);
                return result.rows;
            } finally {
                client.release();
            }
        } finally {
            await pool.end();
        }
    }
}