// @/utils/dynamoUserInfoUtils.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
    DynamoDBDocumentClient, 
    UpdateCommand
} from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = "dwellner_users";

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

export const updateUserField = async (
    cognitoId: string,
    field: string,
    value: string
): Promise<boolean> => {
    try {
        const now = new Date().toISOString();
        
        // Different fields require different update paths
        let updateExpression = 'SET updated_at = :updateTime, ';
        let expressionAttributeNames: { [key: string]: string } = {};
        let expressionAttributeValues: { [key: string]: any } = {
            ':updateTime': now
        };

        // Build the update expression based on the field
        switch (field) {
            case 'preferred_name':
                updateExpression += '#profile.#preferredName = :value';
                expressionAttributeNames['#profile'] = 'profile';
                expressionAttributeNames['#preferredName'] = 'preferred_name';
                expressionAttributeValues[':value'] = value;
                break;
            case 'phone_number':
                updateExpression += 'auth_methods.#phone = :phoneData';
                expressionAttributeNames['#phone'] = 'phone';
                expressionAttributeValues[':phoneData'] = {
                    phone_number: value,
                    phone_verified: false,
                    last_phone_verification_date: now
                };
                break;
            default:
                throw new Error(`Unsupported field for update: ${field}`);
        }

        console.log('Updating DynamoDB with expression:', updateExpression);
        console.log('Attribute names:', expressionAttributeNames);
        console.log('Attribute values:', expressionAttributeValues);

        const command = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${cognitoId}`,
                sk: `PROFILE#${cognitoId}`
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        });

        const response = await docClient.send(command);
        console.log('DynamoDB update response:', response);
        return true;
    } catch (error) {
        console.error('Error updating user field:', error);
        return false;
    }
};