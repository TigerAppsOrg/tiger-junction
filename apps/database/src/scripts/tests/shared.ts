export const assert = (condition: boolean, message: string): boolean => {
    if (!condition) {
        console.error(message);
        return false;
    }
    return true;
};
