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
import { getCognitoUserId } from "./cognitoConfig";

const client = new DynamoDBClient({
    region: "ca-central-1",
    credentials: {
        accessKeyId: 'AKIA3PW5YS7N3QIKX55D',
        secretAccessKey: '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'
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

        console.log('Fetching user data for cognitoId:', cognitoId);

        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${cognitoId}`,
                sk: `PROFILE#${cognitoId}`
            }
        });

        try {
            const response = await docClient.send(command);
            
            if (!response.Item) {
                console.log('No user data found for cognitoId:', cognitoId);
                return null;
            }

            const item = response.Item;
            console.log('User data retrieved successfully');
            
            // Safely extract all properties with defaults
            const authMethods = item.auth_methods || {};
            const emailData = authMethods.email || {};
            const phoneData = authMethods.phone || {};
            const googleData = authMethods.google || {};
            const profile = item.profile || {};
            
            return {
                cognito_id: item.cognito_id,
                auth_methods: {
                    email: {
                        email_address: emailData.email_address || '',
                        email_verified: emailData.email_verified || false,
                        last_email_verification_date: emailData.last_email_verification_date ? 
                            new Date(emailData.last_email_verification_date) : new Date(),
                        auth_metadata: emailData.auth_metadata || {}
                    },
                    phone: phoneData.phone_number ? {
                        phone_number: phoneData.phone_number,
                        phone_verified: phoneData.phone_verified || false,
                        last_phone_verification_date: phoneData.last_phone_verification_date ?
                            new Date(phoneData.last_phone_verification_date) : new Date()
                    } : undefined,
                    google: googleData.google_id ? {
                        google_id: googleData.google_id,
                        google_email: googleData.google_email || ''
                    } : undefined
                },
                profile: {
                    name: profile.name || '',
                    user_type: profile.user_type || 'Home Seeker',
                    date_of_birth: profile.date_of_birth ? 
                        parseDateString(profile.date_of_birth) : new Date(),
                    registration_date: profile.registration_date ?
                        new Date(profile.registration_date) : new Date()
                },
                is_pro: item.is_pro || false
            };
        } catch (error) {
            // If there's an error with DynamoDB, check for pendingUserData instead
            console.log('Error fetching from DynamoDB, checking pendingUserData');
            const pendingDataStr = await AsyncStorage.getItem('pendingUserData');
            if (pendingDataStr) {
                try {
                    const pendingData = JSON.parse(pendingDataStr);
                    if (pendingData.userData) {
                        console.log('Returning user data from pendingUserData');
                        return pendingData.userData;
                    }
                } catch (parseError) {
                    console.error('Error parsing pendingUserData:', parseError);
                }
            }
            throw error; // Re-throw if we couldn't get data from pendingUserData
        }
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
        if (!cognitoId) {
            console.error('Error: cognitoId is required for updateSignInFields');
            return false;
        }
        
        console.log('Updating sign-in fields for cognitoId:', cognitoId);
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
        console.log('Sign-in fields updated successfully');
        return true;
    } catch (error) {
        console.error('Error updating sign-in fields:', error);
        return false;
    }
};

export const updatePasswordResetFields = async (cognitoId: string): Promise<boolean> => {
    try {
        if (!cognitoId) {
            console.error('Error: cognitoId is required for updatePasswordResetFields');
            return false;
        }
        
        console.log('Updating password reset fields for cognitoId:', cognitoId);
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
        console.log('Password reset fields updated successfully');
        return true;
    } catch (error) {
        console.error('Error updating password reset fields:', error);
        return false;
    }
};

export const updateEmailCodeLoginFields = async (cognitoId: string): Promise<boolean> => {
    try {
        if (!cognitoId) {
            console.error('Error: cognitoId is required for updateEmailCodeLoginFields');
            return false;
        }
        
        // Check if this looks like an email rather than a UUID
        const isEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cognitoId);
        
        // If it's an email, try to get the actual cognito ID
        if (isEmailPattern) {
            try {
                const actualCognitoId = await getCognitoUserId(cognitoId);
                if (actualCognitoId) {
                    console.log(`Converted email ${cognitoId} to actual Cognito ID: ${actualCognitoId}`);
                    cognitoId = actualCognitoId;
                } else {
                    console.error('Could not convert email to Cognito ID');
                    return false;
                }
            } catch (error) {
                console.error('Error converting email to Cognito ID:', error);
                return false;
            }
        }
        
        console.log('Updating email code login fields for cognitoId:', cognitoId);
        const now = new Date().toISOString();
        
        try {
            // Attempt a simple update with the correct fields
            const updateCommand = new UpdateCommand({
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
            
            try {
                await docClient.send(updateCommand);
                console.log('Updated login timestamps successfully');
                return true;
            } catch (err) {
                console.error('Update failed, record might not exist:', err);
                return false;
            }
        } catch (error) {
            console.error('Error in updateEmailCodeLoginFields:', error);
            return false;
        }
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