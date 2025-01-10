// @/utils/phoneFormatters.ts
type CountryFormat = {
    regex: RegExp;
    format: (numbers: string) => string;
    lengths: number[];
};

const formatters: Record<string, CountryFormat> = {
    'CN': {
        regex: /^[1]\d{10}$/,
        lengths: [3, 4, 4],
        format: (numbers: string) => {
            if (numbers.length <= 3) return numbers;
            if (numbers.length <= 7) {
                return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
            }
            return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
        }
    },
    'CA': {
        regex: /^[1-9]\d{9}$/,
        lengths: [3, 3, 4],
        format: (numbers: string) => {
            if (numbers.length <= 3) return numbers;
            if (numbers.length <= 6) {
                return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
            }
            return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
        }
    },
    'US': {
        regex: /^[1-9]\d{9}$/,
        lengths: [3, 3, 4],
        format: (numbers: string) => {
            if (numbers.length <= 3) return numbers;
            if (numbers.length <= 6) {
                return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
            }
            return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
        }
    },
    'JP': {
        regex: /^[0-9]\d{9}$/,
        lengths: [3, 4, 4],
        format: (numbers: string) => {
            if (numbers.length <= 3) return numbers;
            if (numbers.length <= 7) {
                return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
            }
            return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
        }
    },
    'KR': {
        regex: /^[0-9]\d{9}$/,
        lengths: [3, 4, 4],
        format: (numbers: string) => {
            if (numbers.length <= 3) return numbers;
            if (numbers.length <= 7) {
                return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
            }
            return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
        }
    }
};

export const formatPhoneNumber = (phoneNumber: string, countryCode: string): string => {
    const numbers = phoneNumber.replace(/\D/g, '');
    const formatter = formatters[countryCode];
    if (!formatter) return phoneNumber;
    return formatter.format(numbers);
};

export const isValidPhoneNumber = (phoneNumber: string, countryCode: string): boolean => {
    const numbers = phoneNumber.replace(/\D/g, '');
    const formatter = formatters[countryCode];
    if (!formatter) return false;
    return formatter.regex.test(numbers);
};