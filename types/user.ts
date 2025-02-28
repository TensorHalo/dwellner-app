// @/types/user.ts
export interface EmailAuthMetadata {
  last_successful_login?: string;
  last_failed_attempt?: string;
  failed_attempts_count?: number;
  password_last_changed?: string;
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

export interface PendingAuthData {
  type: 'SIGNUP' | 'SIGNIN' | 'PASSWORD_RESET' | 'EMAIL_CODE_LOGIN';
  cognito_id: string;
  email: string;
  timestamp: string;
}

export interface PendingAuthDataForPhone {
  type: 'PHONE_CODE_LOGIN';
  cognito_id: string;
  phone_number: string,
  timestamp: string;
}