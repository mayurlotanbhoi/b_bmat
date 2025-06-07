import objectPath from "object-path";

type FlatObject = Record<string, any>;
type NestedObject = Record<string, any>;

/**
 * Converts a flat object with dot notation keys into a nested object.
 * Example: { "a.b": 1 } → { a: { b: 1 } }
 *
 * @param flat The flat object to convert
 * @returns The nested object
 */
export const parseDotNotation = (flat: FlatObject): NestedObject => {
    if (!flat || typeof flat !== 'object' || Array.isArray(flat)) {
        console.warn("Invalid input passed to parseDotNotation. Expected a flat object but got:", flat);
        return {};
    }

    const nested: NestedObject = {};

    try {
        for (const [key, value] of Object.entries(flat)) {
            if (typeof key !== 'string') {
                console.warn(`Skipping non-string key: ${key}`);
                continue;
            }

            objectPath.set(nested, key, value);
        }
    } catch (error) {
        console.error("Error while parsing dot notation:", error);
        throw new Error("Failed to parse dot notation into nested object.");
    }

    return nested;
};
