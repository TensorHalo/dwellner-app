// @/utils/dynamodbGoogleUtils.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
    DynamoDBDocumentClient, 
    PutCommand, 
    GetCommand, 
    UpdateCommand,
    QueryCommand
} from "@aws-sdk/lib-dynamodb";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DynamoDBUserRecord, UserInfoFormData } from '@/types/user';
import { getCognitoUserId } from "./cognitoConfig";

const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true
    }
});

const TABLE_NAME = "dwellner_users";

// Helper functions from your existing utils
const formatTimestamp = (date: Date | string): string => {
    return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
};

const formatBirthDate = (date: Date | string): string => {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Check if user exists in DynamoDB
export const checkUserExistsInDynamoDB = async (cognitoId: string): Promise<boolean> => {
    try {
        console.log('Checking if user exists in DynamoDB:', cognitoId);
        
        if (!cognitoId) {
            console.error('Error: cognitoId is required');
            return false;
        }

        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${cognitoId}`,
                sk: `PROFILE#${cognitoId}`
            }
        });
        
        const response = await docClient.send(command);
        const userExists = !!response.Item;
        
        console.log('User exists in DynamoDB:', userExists);
        return userExists;
    } catch (error) {
        console.error('Error checking if user exists in DynamoDB:', error);
        return false;
    }
};

// Store user data with Google auth information
export const storeGoogleUserData = async (userData: DynamoDBUserRecord): Promise<boolean> => {
    try {
        if (!userData.cognito_id) {
            console.error('Error: cognito_id is required');
            return false;
        }

        console.log('Storing Google user data:', JSON.stringify(userData, null, 2));

        const now = new Date();
        const item = {
            pk: `USER#${userData.cognito_id}`,
            sk: `PROFILE#${userData.cognito_id}`,
            cognito_id: userData.cognito_id,
            auth_methods: {
                google: userData.auth_methods?.google ? {
                    google_id: userData.auth_methods.google.google_id,
                    google_email: userData.auth_methods.google.google_email,
                    last_login_date: formatTimestamp(now),
                    auth_metadata: {
                        last_successful_login: formatTimestamp(now),
                        failed_attempts_count: 0
                    }
                } : null,
                email: userData.auth_methods?.email || null,
                phone: userData.auth_methods?.phone || null
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
        console.log('Google user data stored successfully in DynamoDB');
        return true;
    } catch (error) {
        console.error('Error storing Google user data in DynamoDB:', error);
        return false;
    }
};

// Update Google user login information
export const updateGoogleSignInFields = async (cognitoId: string, googleId: string, email: string): Promise<boolean> => {
    try {
        if (!cognitoId) {
            console.error('Error: cognitoId is required for updateGoogleSignInFields');
            return false;
        }
        
        console.log('Updating Google sign-in fields for cognitoId:', cognitoId);
        const now = new Date().toISOString();
        
        // First, check if user exists
        const userExists = await checkUserExistsInDynamoDB(cognitoId);
        if (!userExists) {
            console.log('User not found in DynamoDB, cannot update Google sign-in fields');
            return false;
        }
        
        // User exists, update the Google auth fields
        const updateCommand = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${cognitoId}`,
                sk: `PROFILE#${cognitoId}`
            },
            UpdateExpression: `
                SET auth_methods.google.last_login_date = :loginDate,
                    auth_methods.google.auth_metadata.last_successful_login = :loginTime,
                    auth_methods.google.auth_metadata.failed_attempts_count = :resetCount,
                    updated_at = :updateTime
            `,
            ExpressionAttributeValues: {
                ':loginDate': now,
                ':loginTime': now,
                ':resetCount': 0,
                ':updateTime': now
            }
        });
        
        await docClient.send(updateCommand);
        console.log('Google sign-in fields updated successfully');
        return true;
    } catch (error) {
        console.error('Error updating Google sign-in fields:', error);
        return false;
    }
};

// Prepare Google user data for storage
export const prepareGoogleUserDataForDB = (
    cognitoId: string,
    googleId: string,
    email: string,
    userInfo: UserInfoFormData
): DynamoDBUserRecord => {
    const now = new Date();
    
    return {
        cognito_id: cognitoId,
        auth_methods: {
            google: {
                google_id: googleId,
                google_email: email,
                last_login_date: now,
                auth_metadata: {
                    last_successful_login: now.toISOString(),
                    failed_attempts_count: 0
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