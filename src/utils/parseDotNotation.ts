import objectPath from "object-path";

type FlatObject = Record<string, any>;
type NestedObject = Record<string, any>;

export const parseDotNotation = (flat: FlatObject): NestedObject => {
    const nested: NestedObject = {};
    for (const [key, value] of Object.entries(flat)) {
        objectPath.set(nested, key, value);
    }
    return nested;
};
