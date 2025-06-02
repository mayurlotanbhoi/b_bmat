// utils/calculateProfileCompletion.js
function calculateProfileCompletion(profile: any) {
    let completedFields = 0;
    let totalFields = 0;

    function countFields(obj: any) {
        for (const key in obj) {
            if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
                countFields(obj[key]);
            } else {
                totalFields++;
                if (obj[key] !== null && obj[key] !== "" && obj[key] !== undefined) {
                    completedFields++;
                }
            }
        }
    }

    countFields(profile.toObject ? profile.toObject() : profile);

    const percent = totalFields ? Math.round((completedFields / totalFields) * 100) : 0;
    return percent;
}
export { calculateProfileCompletion };
