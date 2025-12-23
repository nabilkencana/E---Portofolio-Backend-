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
    name?: string;
    role: string;
    emailVerified: boolean;

    @Transform(({ value }) => value || null)
    profile?: ProfileEntity ;

    createdAt: Date;
    updatedAt: Date;
    @Exclude()
    password: string;

    @Exclude()
    refreshToken?: string | null;

    @Exclude()
    refreshTokenExp?: Date | null;

    constructor(partial: Partial<UserEntity>) {
        Object.assign(this, partial);
    }
}