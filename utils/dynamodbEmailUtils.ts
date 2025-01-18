// @/utils/dynamodbEmailUtils.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
    DynamoDBDocumentClient, 
    PutCommand, 
    GetCommand, 
    UpdateCommand,
    QueryCommand
} from "@aws-sdk/lib-dynamodb";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DynamoDBUserRecord, EmailAuthMetadata, UserInfoFormData } from '@/types/user';

const client = new DynamoDBClient({
    region: "us-east-1",
    credentials: {
        accessKeyId: "AKIAWDARUP7MHJ5IRB3Y",
        secretAccessKey: "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"
    }
});

const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true
    }
});

const TABLE_NAME = "dwellner_users";

const ensureDate = (date: Date | string): Date => {
    return date instanceof Date ? date : new Date(date);
};

const formatBirthDate = (date: Date | string): string => {
    const d = ensureDate(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const parseDateString = (dateStr: string): Date => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    return new Date(dateStr);
};

const formatTimestamp = (date: Date | string): string => {
    const d = ensureDate(date);
    return d.toISOString();
};

const isValidDate = (date: any): boolean => {
    return date instanceof Date || (typeof date === 'string' && !isNaN(Date.parse(date)));
};

export const storeUserData = async (userData: DynamoDBUserRecord): Promise<boolean> => {
    try {
        if (!userData.cognito_id) {
            console.error('Error: cognito_id is required');
            return false;
        }

        console.log('Storing user data:', JSON.stringify(userData, null, 2));

        const now = new Date();
        const item = {
            pk: `USER#${userData.cognito_id}`,
            sk: `PROFILE#${userData.cognito_id}`,
            cognito_id: userData.cognito_id,
            auth_methods: {
                email: userData.auth_methods?.email ? {
                    email_address: userData.auth_methods.email.email_address,
                    email_verified: userData.auth_methods.email.email_verified,
                    last_email_verification_date: isValidDate(userData.auth_methods.email.last_email_verification_date) 
                        ? formatTimestamp(userData.auth_methods.email.last_email_verification_date)
                        : formatTimestamp(now),
                    auth_metadata: {
                        ...userData.auth_methods.email.auth_metadata,
                        last_successful_login: formatTimestamp(now),
                        failed_attempts_count: 0,
                        password_last_changed: formatTimestamp(now)
                    }
                } : null,
                google: userData.auth_methods?.google || null,
                phone: userData.auth_methods?.phone ? {
                    ...userData.auth_methods.phone,
                    last_phone_verification_date: isValidDate(userData.auth_methods.phone.last_phone_verification_date)
                        ? formatTimestamp(userData.auth_methods.phone.last_phone_verification_date)
                        : formatTimestamp(now)
                } : null
            },
            profile: {
                name: userData.profile.name,
                user_type: userData.profile.user_type,
                date_of_birth: formatBirthDate(userData.profile.date_of_birth),
                registration_date: formatTimestamp(userData.profile.registration_date)
            },
            is_pro: userData.is_pro || false,
            gsi1pk: `USERTYPE#${userData.profile.user_type}`,
            gsi1sk: formatTimestamp(now),
            updated_at: formatTimestamp(now)
        };

        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: item
        });

        await docClient.send(command);
        await AsyncStorage.removeItem('pendingUserData');
        console.log('User data stored successfully in DynamoDB');
        return true;
    } catch (error) {
        console.error('Error storing user data in DynamoDB:', error);
        return false;
    }
};

export const getUserData = async (cognitoId: string): Promise<DynamoDBUserRecord | null> => {
    try {
        if (!cognitoId) {
            console.error('Error: cognitoId is required');
            return null;
        }

        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${cognitoId}`,
                sk: `PROFILE#${cognitoId}`
            }
        });

        const response = await docClient.send(command);
        
        if (!response.Item) {
            return null;
        }

        const item = response.Item;
        return {
            cognito_id: item.cognito_id,
            auth_methods: {
                email: item.auth_methods.email ? {
                    ...item.auth_methods.email,
                    last_email_verification_date: new Date(item.auth_methods.email.last_email_verification_date),
                    auth_metadata: item.auth_methods.email.auth_metadata
                } : undefined,
                phone: item.auth_methods.phone ? {
                    ...item.auth_methods.phone,
                    last_phone_verification_date: new Date(item.auth_methods.phone.last_phone_verification_date)
                } : undefined,
                google: item.auth_methods.google
            },
            profile: {
                ...item.profile,
                date_of_birth: parseDateString(item.profile.date_of_birth),
                registration_date: new Date(item.profile.registration_date)
            },
            is_pro: item.is_pro
        };
    } catch (error) {
        console.error('Error fetching user data from DynamoDB:', error);
        return null;
    }
};

export const fetchPendingUserData = async (): Promise<DynamoDBUserRecord | null> => {
    try {
        const pendingData = await AsyncStorage.getItem('pendingUserData');
        if (!pendingData) return null;

        const parsed = JSON.parse(pendingData);
        const now = new Date();
        
        return {
            ...parsed,
            auth_methods: {
                ...parsed.auth_methods,
                email: parsed.auth_methods.email ? {
                    ...parsed.auth_methods.email,
                    last_email_verification_date: now,
                    auth_metadata: {
                        password_last_changed: formatTimestamp(now),
                        failed_attempts_count: 0
                    }
                } : undefined,
                phone: parsed.auth_methods.phone ? {
                    ...parsed.auth_methods.phone,
                    last_phone_verification_date: now
                } : undefined
            },
            profile: {
                ...parsed.profile,
                date_of_birth: new Date(parsed.profile.date_of_birth),
                registration_date: now
            }
        };
    } catch (error) {
        console.error('Error fetching pending user data:', error);
        return null;
    }
};

export const getUsersByType = async (
    userType: DynamoDBUserRecord['profile']['user_type']
): Promise<DynamoDBUserRecord[]> => {
    try {
        const command = new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: "gsi1pk-gsi1sk-index",
            KeyConditionExpression: "gsi1pk = :userType",
            ExpressionAttributeValues: {
                ":userType": `USERTYPE#${userType}`
            }
        });

        const response = await docClient.send(command);
        
        return (response.Items || []).map(item => ({
            cognito_id: item.cognito_id,
            auth_methods: {
                email: item.auth_methods.email ? {
                    ...item.auth_methods.email,
                    last_email_verification_date: new Date(item.auth_methods.email.last_email_verification_date),
                    auth_metadata: item.auth_methods.email.auth_metadata
                } : undefined,
                phone: item.auth_methods.phone ? {
                    ...item.auth_methods.phone,
                    last_phone_verification_date: new Date(item.auth_methods.phone.last_phone_verification_date)
                } : undefined,
                google: item.auth_methods.google
            },
            profile: {
                ...item.profile,
                date_of_birth: parseDateString(item.profile.date_of_birth),
                registration_date: new Date(item.profile.registration_date)
            },
            is_pro: item.is_pro
        }));
    } catch (error) {
        console.error('Error querying users by type:', error);
        return [];
    }
};

export const updateSignInFields = async (cognitoId: string, email: string): Promise<boolean> => {
    try {
        const now = new Date().toISOString();
        
        const command = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${cognitoId}`,
                sk: `PROFILE#${cognitoId}`
            },
            UpdateExpression: `
                SET auth_methods.email.last_email_verification_date = :verificationDate,
                    auth_methods.email.auth_metadata.last_successful_login = :loginTime,
                    auth_methods.email.auth_metadata.failed_attempts_count = :resetCount,
                    updated_at = :updateTime
            `,
            ExpressionAttributeValues: {
                ':verificationDate': now,
                ':loginTime': now,
                ':resetCount': 0,
                ':updateTime': now
            }
        });

        await docClient.send(command);
        return true;
    } catch (error) {
        console.error('Error updating sign-in fields:', error);
        return false;
    }
};

export const updatePasswordResetFields = async (cognitoId: string): Promise<boolean> => {
    try {
        const now = new Date().toISOString();
        
        const command = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${cognitoId}`,
                sk: `PROFILE#${cognitoId}`
            },
            UpdateExpression: `
                SET auth_methods.email.auth_metadata.password_last_changed = :changeTime,
                    auth_methods.email.auth_metadata.failed_attempts_count = :resetCount,
                    updated_at = :updateTime
            `,
            ExpressionAttributeValues: {
                ':changeTime': now,
                ':resetCount': 0,
                ':updateTime': now
            }
        });

        await docClient.send(command);
        return true;
    } catch (error) {
        console.error('Error updating password reset fields:', error);
        return false;
    }
};

export const updateEmailCodeLoginFields = async (cognitoId: string): Promise<boolean> => {
    try {
        const now = new Date().toISOString();
        
        const command = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${cognitoId}`,
                sk: `PROFILE#${cognitoId}`
            },
            UpdateExpression: `
                SET auth_methods.email.last_email_verification_date = :verificationDate,
                    auth_methods.email.auth_metadata.last_successful_login = :loginTime,
                    updated_at = :updateTime
            `,
            ExpressionAttributeValues: {
                ':verificationDate': now,
                ':loginTime': now,
                ':updateTime': now
            }
        });

        await docClient.send(command);
        return true;
    } catch (error) {
        console.error('Error updating email code login fields:', error);
        return false;
    }
};

export const prepareUserDataForDB = (
    cognitoId: string,
    email: string,
    userInfo: UserInfoFormData
): DynamoDBUserRecord => {
    const now = new Date();
    
    return {
        cognito_id: cognitoId,
        auth_methods: {
            email: {
                email_address: email,
                email_verified: true,
                last_email_verification_date: now,
                auth_metadata: {
                    last_successful_login: now.toISOString(),
                    failed_attempts_count: 0,
                    password_last_changed: now.toISOString()
                }
            }
        },
        profile: {
            name: userInfo.name,
            user_type: userInfo.user_type,
            date_of_birth: userInfo.date_of_birth,
            registration_date: now
        },
        is_pro: false
    };
};