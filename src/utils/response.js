export const sendResponse = ({
    res,
    statusCode = 200,
    status = 'success',
    message = 'Success',
    data = null,
    errors = null,
    code = null,
    meta = {}
}) => {
    res.status(statusCode).json({
        status,
        message,
        code,
        data,
        errors,
        meta: {
            timestamp: new Date().toISOString(),
            ...meta
        }
    });
};
