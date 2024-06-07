/**
 * Gets the API token from the registrar API
 * @returns {Promise<string>} - The token to be used in the header of the request to the registrar API
 */
export const getToken = async () => {
    let response = await fetch(
        "https://registrar.princeton.edu/course-offerings"
    );
    let text = await response.text();
    return "Bearer " + text.split('apiToken":"')[1].split('"')[0];
};
