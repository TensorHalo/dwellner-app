// @/types/user.ts
export interface EmailAuthMetadata {
  last_successful_login?: string;
  last_failed_attempt?: string;
  failed_attempts_count?: number;
  password_last_changed?: string;
}

export interface GoogleAuthMetadata {
  last_successful_login?: string;
  last_failed_attempt?: string;
  failed_attempts_count?: number;
}

export interface DynamoDBUserRecord {
  cognito_id: string;
  auth_methods: {
      email?: {
          email_address: string;
          email_verified: boolean;
          last_email_verification_date: Date;
          auth_metadata: EmailAuthMetadata;
      };
      google?: {
          google_id: string;
          google_email: string;
          last_login_date?: Date;
          auth_metadata?: GoogleAuthMetadata;
      };
      phone?: {
          phone_number: string;
          phone_verified: boolean;
          last_phone_verification_date: Date;
      };
  };
  profile: {
      name: string;
      user_type: 'Home Seeker' | 'Agent' | 'Property Manager' | 'Landlord' | 'Developer';
      date_of_birth: Date;
      registration_date: Date;
  };
  is_pro: boolean;
}

export interface UserInfoFormData {
  name: string;
  user_type: DynamoDBUserRecord['profile']['user_type'];
  date_of_birth: Date;
}

// Modified PendingAuthData to include Google authentication types
export interface PendingAuthData {
  type: 'SIGNUP' | 'SIGNIN' | 'PASSWORD_RESET' | 'EMAIL_CODE_LOGIN' | 'GOOGLE_SIGNIN' | 'GOOGLE_SIGNUP';
  cognito_id: string;
  email: string;
  timestamp: string;
  // Additional fields for Google auth
  google_id?: string;
  userData?: DynamoDBUserRecord;
}

export interface PendingAuthDataForPhone {
  type: 'PHONE_CODE_LOGIN';
  cognito_id: string;
  phone_number: string;
  timestamp: string;
}