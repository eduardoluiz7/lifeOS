export interface User {
    id: string;
    aud: string;
    role: string;
    email: string;
    email_confirmed_at: string | null;
    phone: string | null;
    confirmed_at: string | null;
    last_sign_in_at: string | null;
    app_metadata: AppMetadata;
    user_metadata: UserMetadata;
    identities: Identity[];
    created_at: string;
    updated_at: string;
    is_anonymous: boolean;
}

export interface AppMetadata {
    provider: string;
    providers: string[];
}

export interface UserMetadata {
    email_verified: boolean;
    full_name?: string;
    [key: string]: unknown;
}

export interface Identity {
    identity_id: string;
    id: string;
    user_id: string;
    identity_data: IdentityData;
    provider: string;
    last_sign_in_at: string | null;
    created_at: string;
    updated_at: string;
    email: string;
}

export interface IdentityData {
    email: string;
    email_verified: boolean;
    phone_verified: boolean;
    sub: string;
    [key: string]: unknown;
}