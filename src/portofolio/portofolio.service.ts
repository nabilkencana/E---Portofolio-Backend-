import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import PDFDocument from 'pdfkit';
type PDFDocumentType = typeof PDFDocument.prototype;
import { Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export interface PortfolioData {
  user: {
    name: string;
    nip: string | null;
    email: string;
    phone: string | null;
  };
  profile: {
    school: {
      schoolName: string;
      address: string | null;
      city: string | null;
      province: string | null;
    } | null;
    address: string | null;
  };
  teacherDetail: {
    subjectTaught: string | null;
    educationLevel: string | null;
    yearsOfExperience: number | null;
    competencies: string | null;
  } | null;
  educations: Array<{
    institution: string;
    degree: string;
    field: string | null;
    startYear: number;
    endYear: number | null;
    isCurrent: boolean;
  }>;
  experiences: Array<{
    company: string;
    position: string;
    description: string | null;
    startDate: Date;
    endDate: Date | null;
    isCurrent: boolean;
  }>;
  skills: Array<{
    name: string;
    level: string;
    category: string | null;
  }>;
  subjects: Array<{
    name: string;
    level: string | null;
  }>;
  achievements: Array<{
    title: string;
    type: string;
    description: string | null;
    level: string | null;
    year: number | null;
    validationStatus: string;
  }>;
}

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role key

@Injectable()
export class PortfolioService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
    private supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY),
  ) { }

  async getPortfolioData(userId: string): Promise<PortfolioData> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: {
            include: {
              school: true,
            },
          },
          teacher_detail: true,
          educations: {
            orderBy: { startYear: 'desc' },
          },
          experiences: {
            orderBy: { startDate: 'desc' },
          },
          skills: {
            orderBy: { name: 'asc' },
          },
          subjects: {
            orderBy: { name: 'asc' },
          },
          achievements: {
            where: {
              validationStatus: {
                in: ['APPROVED', 'REVISION'], // hanya ambil yang APPROVED & REVISION
              },
            },
            orderBy: { year: 'desc' },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        user: {
          name: user.profile?.name || user.name || '',
          nip: user.profile?.nip || null,
          email: user.email,
          phone: user.profile?.phone || null,
        },
        profile: {
          school: user.profile?.school
            ? {
              schoolName: user.profile.school.schoolName,
              address: user.profile.school.address,
              city: user.profile.school.city,
              province: user.profile.school.province,
            }
            : null,
          address: user.profile?.address || null,
        },
        teacherDetail: user.teacher_detail
          ? {
            subjectTaught: user.teacher_detail.subjectTaught,
            educationLevel: user.teacher_detail.educationLevel,
            yearsOfExperience: user.teacher_detail.yearsOfExperience,
            competencies: user.teacher_detail.competencies,
          }
          : null,
        educations: user.educations.map((edu) => ({
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field,
          startYear: edu.startYear,
          endYear: edu.endYear,
          isCurrent: edu.isCurrent,
        })),
        experiences: user.experiences.map((exp) => ({
          company: exp.company,
          position: exp.position,
          description: exp.description,
          startDate: exp.startDate,
          endDate: exp.endDate,
          isCurrent: exp.isCurrent,
        })),
        skills: user.skills.map((skill) => ({
          name: skill.name,
          level: skill.level,
          category: skill.category,
        })),
        subjects: user.subjects.map((subject) => ({
          name: subject.name,
          level: subject.level,
        })),
        achievements: user.achievements.map((ach) => ({
          title: ach.title,
          type: ach.type,
          description: ach.description,
          level: ach.level,
          year: ach.year,
          validationStatus: ach.validationStatus,
        })),
      };
    } catch (error) {
      Logger.error('Error in getPortfolioData', error);
      throw error;
    }
  }

  async generatePDF(userId: string, res: Response): Promise<void> {
    const portfolioData = await this.getPortfolioData(userId);

    // Create PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="portofolio.pdf"');

    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    this.addPortfolioContent(doc, portfolioData);

    // Finalize PDF
    doc.end();
  }

  async generatePDFBuffer(userId: string): Promise<Buffer> {
    const portfolioData = await this.getPortfolioData(userId);

    return new Promise((resolve, reject) => {
      const buffers: Buffer[] = [];
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
      });

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      this.addPortfolioContent(doc, portfolioData);
      doc.end();
    });
  }

  async generatePDFForDownload(userId: string, res: Response): Promise<void> {
    const portfolioData = await this.getPortfolioData(userId);
    const fileName = `Portofolio_${portfolioData.user.name.replace(/\s+/g, '_')}.pdf`;

    // Create PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
    });

    // Set response headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    this.addPortfolioContent(doc, portfolioData);

    // Finalize PDF
    doc.end();
  }

  private addPortfolioContent(doc: PDFDocumentType, data: PortfolioData) {
    // Header dengan logo/kop surat
    this.addHeader(doc, data);

    // Data Pribadi
    this.addPersonalInfo(doc, data);

    // Pendidikan
    this.addEducation(doc, data);

    // Pengalaman Kerja
    this.addExperience(doc, data);

    // Keahlian
    this.addSkills(doc, data);

    // Mata Pelajaran
    this.addSubjects(doc, data);

    // Prestasi & Sertifikat
    this.addAchievements(doc, data);

    // Kompetensi
    this.addCompetencies(doc, data);

    // Footer
    this.addFooter(doc);
  }

  private addHeader(doc: PDFDocumentType, data: PortfolioData) {
    // Jika ada sekolah, tambahkan kop surat
    if (data.profile.school) {
      const school = data.profile.school;

      // Header sekolah
      doc.fontSize(16).font('Helvetica-Bold').text(school.schoolName.toUpperCase(), {
        align: 'center'
      });

      if (school.address || school.city) {
        const address = [school.address, school.city, school.province]
          .filter(Boolean)
          .join(', ');
        doc.fontSize(10).font('Helvetica').text(address, { align: 'center' });
      }

      // Garis pemisah
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1.5);
    }

    // Judul Portofolio
    doc.fontSize(20).font('Helvetica-Bold').text('PORTOFOLIO PROFESIONAL', {
      align: 'center'
    });
    doc.fontSize(14).font('Helvetica').text(data.user.name.toUpperCase(), {
      align: 'center'
    });

    if (data.user.nip) {
      doc.fontSize(12).font('Helvetica').text(`NIP: ${data.user.nip}`, {
        align: 'center'
      });
    }

    doc.moveDown(2);
  }

  private addPersonalInfo(doc: PDFDocumentType, data: PortfolioData) {
    doc.fontSize(16).font('Helvetica-Bold').text('I. DATA PRIBADI');
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(200, doc.y).stroke();
    doc.moveDown(0.5);

    const info = [
      ['Nama Lengkap', data.user.name],
      ['NIP', data.user.nip || '-'],
      ['Email', data.user.email],
      ['Telepon', data.user.phone || '-'],
      ['Alamat', data.profile.address || '-'],
      ['Asal Sekolah', data.profile.school?.schoolName || '-'],
    ];

    info.forEach(([label, value]) => {
      doc.fontSize(11).font('Helvetica-Bold').text(`${label}:`, {
        continued: true
      }).font('Helvetica').text(` ${value}`);
    });

    if (data.teacherDetail) {
      const teacherInfo = [
        ['Mata Pelajaran', data.teacherDetail.subjectTaught || '-'],
        ['Pendidikan Terakhir', data.teacherDetail.educationLevel || '-'],
        ['Pengalaman Mengajar', data.teacherDetail.yearsOfExperience ? `${data.teacherDetail.yearsOfExperience} tahun` : '-'],
      ];

      teacherInfo.forEach(([label, value]) => {
        doc.fontSize(11).font('Helvetica-Bold').text(`${label}:`, {
          continued: true
        }).font('Helvetica').text(` ${value}`);
      });
    }

    doc.moveDown(2);
  }

  private addEducation(doc: PDFDocumentType, data: PortfolioData) {
    if (data.educations.length === 0) return;

    doc.fontSize(16).font('Helvetica-Bold').text('II. RIWAYAT PENDIDIKAN');
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
    doc.moveDown(0.5);

    data.educations.forEach((edu, index) => {
      doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${edu.institution}`);
      doc.fontSize(11).font('Helvetica').text(`   Gelar: ${edu.degree}`);
      if (edu.field) {
        doc.text(`   Bidang: ${edu.field}`);
      }

      const yearText = edu.isCurrent
        ? `${edu.startYear} - Sekarang`
        : `${edu.startYear} - ${edu.endYear}`;
      doc.text(`   Periode: ${yearText}`);

      doc.moveDown(0.5);
    });

    doc.moveDown(1);
  }

  private addExperience(doc: PDFDocumentType, data: PortfolioData) {
    if (data.experiences.length === 0) return;

    doc.fontSize(16).font('Helvetica-Bold').text('III. PENGALAMAN KERJA');
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
    doc.moveDown(0.5);

    data.experiences.forEach((exp, index) => {
      doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${exp.position}`);
      doc.fontSize(11).font('Helvetica').text(`   Perusahaan/Institusi: ${exp.company}`);

      const startDate = new Date(exp.startDate);
      const endDate = exp.endDate ? new Date(exp.endDate) : null;
      const dateText = exp.isCurrent
        ? `${this.formatDate(startDate)} - Sekarang`
        : `${this.formatDate(startDate)} - ${this.formatDate(endDate!)}`;
      doc.text(`   Periode: ${dateText}`);

      if (exp.description) {
        doc.text(`   Deskripsi: ${exp.description}`);
      }

      doc.moveDown(0.5);
    });

    doc.moveDown(1);
  }

  private addSkills(doc: PDFDocumentType, data: PortfolioData) {
    if (data.skills.length === 0) return;

    doc.fontSize(16).font('Helvetica-Bold').text('IV. KE AHLIAN');
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(150, doc.y).stroke();
    doc.moveDown(0.5);

    const skillsByCategory = data.skills.reduce((acc, skill) => {
      const category = skill.category || 'Lainnya';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(skill);
      return acc;
    }, {} as Record<string, typeof data.skills>);

    Object.entries(skillsByCategory).forEach(([category, skills]) => {
      doc.fontSize(12).font('Helvetica-Bold').text(`${category}:`);

      const skillList = skills.map(skill => {
        const levelMap: Record<string, string> = {
          'BEGINNER': 'Pemula',
          'INTERMEDIATE': 'Menengah',
          'ADVANCED': 'Mahir',
          'EXPERT': 'Ahli',
        };
        const level = levelMap[skill.level] || skill.level;
        return `${skill.name} (${level})`;
      }).join(', ');

      doc.fontSize(11).font('Helvetica').text(`   ${skillList}`, {
        indent: 10
      });

      doc.moveDown(0.3);
    });

    doc.moveDown(1);
  }

  private addSubjects(doc: PDFDocumentType, data: PortfolioData) {
    if (data.subjects.length === 0) return;

    doc.fontSize(16).font('Helvetica-Bold').text('V. MATA PELAJARAN YANG DIAJARKAN');
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(350, doc.y).stroke();
    doc.moveDown(0.5);

    const subjectsByLevel = data.subjects.reduce((acc, subject) => {
      const level = subject.level || 'Umum';
      if (!acc[level]) {
        acc[level] = [];
      }
      acc[level].push(subject.name);
      return acc;
    }, {} as Record<string, string[]>);

    Object.entries(subjectsByLevel).forEach(([level, subjects]) => {
      doc.fontSize(12).font('Helvetica-Bold').text(`${level}:`);
      doc.fontSize(11).font('Helvetica').text(`   ${subjects.join(', ')}`, {
        indent: 10
      });
      doc.moveDown(0.3);
    });

    doc.moveDown(1);
  }

  private addAchievements(doc: PDFDocumentType, data: PortfolioData) {
    if (data.achievements.length === 0) return;

    const achievements = data.achievements.filter(a => a.type === 'prestasi');
    const certificates = data.achievements.filter(a => a.type === 'sertifikat');

    if (achievements.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('VI. PRESTASI');
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(120, doc.y).stroke();
      doc.moveDown(0.5);

      achievements.forEach((ach, index) => {
        doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${ach.title}`);
        doc.fontSize(11).font('Helvetica');

        if (ach.year) {
          doc.text(`   Tahun: ${ach.year}`);
        }

        if (ach.level) {
          const levelMap: Record<string, string> = {
            'sekolah': 'Tingkat Sekolah',
            'kecamatan': 'Tingkat Kecamatan',
            'kabupaten': 'Tingkat Kabupaten/Kota',
            'provinsi': 'Tingkat Provinsi',
            'nasional': 'Tingkat Nasional',
            'internasional': 'Tingkat Internasional',
          };
          const level = levelMap[ach.level] || ach.level;
          doc.text(`   Tingkat: ${level}`);
        }

        if (ach.description) {
          doc.text(`   Deskripsi: ${ach.description}`);
        }

        doc.moveDown(0.5);
      });
    }

    if (certificates.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('VII. SERTIFIKAT');
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(140, doc.y).stroke();
      doc.moveDown(0.5);

      certificates.forEach((cert, index) => {
        doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${cert.title}`);
        doc.fontSize(11).font('Helvetica');

        if (cert.year) {
          doc.text(`   Tahun: ${cert.year}`);
        }

        if (cert.level) {
          const levelMap: Record<string, string> = {
            'sekolah': 'Tingkat Sekolah',
            'kecamatan': 'Tingkat Kecamatan',
            'kabupaten': 'Tingkat Kabupaten/Kota',
            'provinsi': 'Tingkat Provinsi',
            'nasional': 'Tingkat Nasional',
            'internasional': 'Tingkat Internasional',
          };
          const level = levelMap[cert.level] || cert.level;
          doc.text(`   Tingkat: ${level}`);
        }

        if (cert.description) {
          doc.text(`   Deskripsi: ${cert.description}`);
        }

        doc.moveDown(0.5);
      });
    }

    doc.moveDown(1);
  }

  private addCompetencies(doc: PDFDocumentType, data: PortfolioData) {
    if (!data.teacherDetail?.competencies) return;

    if (doc.y > 700) {
      doc.addPage();
    }

    doc.fontSize(16).font('Helvetica-Bold').text('VIII. KOMPETENSI KHUSUS');
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica').text(data.teacherDetail.competencies, {
      align: 'justify',
      lineGap: 5
    });

    doc.moveDown(1);
  }

  private addFooter(doc: PDFDocumentType) {
    const currentPage = doc.bufferedPageRange().count;

    doc.fontSize(10).font('Helvetica').text(
      `Halaman ${currentPage}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    // Tambahkan cap dan tanda tangan
    doc.moveDown(3);
    doc.text('Menyetujui,', { align: 'right' });
    doc.moveDown(2);
    doc.text('Kepala Sekolah', { align: 'right' });
    doc.moveDown(3);
    doc.text('(__________________________)', { align: 'right' });
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
    });
  }
}