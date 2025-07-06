function deepMerge(target: any, source: any): any {
    if (!source) return target;
    if (!target) return source;

    const output = { ...target };

    for (const key of Object.keys(source)) {
        if (
            source[key] &&
            typeof source[key] === "object" &&
            !Array.isArray(source[key])
        ) {
            output[key] = deepMerge(target[key] || {}, source[key]);
        } else if (source[key] !== undefined) {
            output[key] = source[key];
        }
    }

    return output;
}


export default deepMerge;