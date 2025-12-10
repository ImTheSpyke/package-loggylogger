export class JSONBigInt {
    private static _replacer = (_key: string, value: any): any => {
        if (typeof value === 'bigint') {
            return {
                _type: 'bigint',
                _value: value.toString(),
            };
        }
        return value;
    };

    private static _reviver = (_key: string, value: any): any => {
        if (value && value._type === 'bigint') {
            return BigInt(value._value);
        }
        return value;
    };

    public static parse(json: string): any {
        return JSON.parse(json, JSONBigInt._reviver);
    }

    public static stringify(json: any): string {
        return JSON.stringify(json, JSONBigInt._replacer);
    }
}
