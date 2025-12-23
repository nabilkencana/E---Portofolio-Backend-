// src/auth/entities/user.entity.ts
import { Exclude, Transform } from 'class-transformer';

export class ProfileEntity {
    id: string;
    nip?: string | null;
    institution?: string | null;
    position?: string | null;
    phone?: string | null;
    address?: string | null;
    avatarUrl?: string | null;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<ProfileEntity>) {
        Object.assign(this, partial);
    }
}

export class UserEntity {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    emailVerified: boolean;

    profile?: {
        id: string;
        userId: string;
        name?: string | null;
        nip?: string | null;
        email?: string | null;
        phone?: string | null;
        schoolId?: string | null;
        avatarUrl?: string | null;
        address?: string | null;
        createdAt: Date;
        updatedAt: Date;
        school?: {
            id: string;
            schoolCode: string;
            schoolName: string;
            schoolType: string;
            address?: string | null;
            city?: string | null;
            province?: string | null;
            postalCode?: string | null;
            phone?: string | null;
            email?: string | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    } | null;

    teacherDetail?: {
        id: string;
        userId: string;
        subjectTaught?: string | null;
        competencies?: string | null;
        educationLevel?: string | null;
        yearsOfExperience?: number | null;
        teachingCertificate?: string | null;
        certificationNumber?: string | null;
        specialization?: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null;

    createdAt: Date;
    updatedAt: Date;

    @Exclude()
    password: string;

    @Exclude()
    refreshToken?: string | null;

    @Exclude()
    refreshTokenExp?: Date | null;

    @Exclude()
    teacher_detail?: any;

    constructor(partial: Partial<UserEntity>) {
        Object.assign(this, partial);
    }
}