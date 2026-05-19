import { PrismaService } from '../../infrastructure/prisma/prisma.service';
export declare class SysHealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    health(): {
        status: string;
        timestamp: number;
    };
    live(): {
        status: string;
        timestamp: number;
    };
    ready(): Promise<{
        status: string;
        timestamp: number;
        checks: {
            database: {
                status: "up" | "down";
                latencyMs: number;
            };
        };
    }>;
}
