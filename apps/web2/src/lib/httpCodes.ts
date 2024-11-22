export const httpCodes = {
    success: {
        ok: 200,
        created: 201,
        accepted: 202,
        noContent: 204
    },
    redirection: {
        movedPermanently: 301,
        seeOther: 303,
        temporaryRedirect: 307,
        permanentRedirect: 308
    },
    error: {
        badRequest: 400,
        unauthorized: 401,
        forbidden: 403,
        notFound: 404,
        methodNotAllowed: 405,
        internalServerError: 500,
        notImplemented: 501
    }
};
