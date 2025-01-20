// @/types/settings.ts
export interface PersonalInfoFieldUpdate {
    field: 'preferred_first_name' | 'phone_number' | 'avatar_url';
    value: string;
}

export interface PersonalInfoField {
    label: string;
    value: string;
    onPress?: () => void;
    isEditable?: boolean;
}

export interface ProfileData {
    name: string;
    avatarUrl?: string;
}