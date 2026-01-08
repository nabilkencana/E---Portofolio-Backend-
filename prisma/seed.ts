import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    const filePath = path.join(__dirname, 'data', 'schools.json');
    const schools = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    await prisma.school.createMany({
        data: schools,
        skipDuplicates: true,
    });

    console.log('✅ Semua data sekolah berhasil di-seed');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
