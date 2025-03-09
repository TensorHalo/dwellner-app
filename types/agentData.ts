// @/types/agentData.ts
export interface AgentData {
    memberKey: string;
    firstName: string;
    lastName: string;
    nickname?: string | null;
    jobTitle?: string | null;
    agencyName?: string | null;
    officeKey?: string | null;
    officePhone?: string | null;
    officePhoneExt?: string | null;
    cellPhone?: string | null;
    fax?: string | null;
    email?: boolean;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    stateOrProvince?: string | null;
    postalCode?: string | null;
    country?: string | null;
    photoUrl?: string | null;
    websiteUrl?: string | null;
    socialMedia?: Array<{
        socialMediaType: string;
        socialMediaUrlOrId: string;
    }>;
}