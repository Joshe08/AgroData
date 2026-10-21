import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const rawUrl = process.env.DATABASE_URL || 'file:./dev.db';
    let resolvedUrl = rawUrl;

    if (rawUrl.startsWith('file:')) {
      const dbPath = rawUrl.replace('file:', '').trim();
      if (!path.isAbsolute(dbPath)) {
        const candidateInBackend = path.resolve(process.cwd(), 'backend', dbPath);
        const candidateInCwd = path.resolve(process.cwd(), dbPath);
        if (fs.existsSync(candidateInBackend)) {
          resolvedUrl = `file:${candidateInBackend}`;
        } else {
          resolvedUrl = `file:${candidateInCwd}`;
        }
      }
    }

    const adapter = new PrismaBetterSqlite3({
      url: resolvedUrl,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
