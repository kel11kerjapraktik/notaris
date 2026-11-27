export type UserRole = 'notaris' | 'staf';

export type User = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    role_label: string;
    is_notaris: boolean;
    avatar?: string;
    email_verified_at?: string | null;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};
