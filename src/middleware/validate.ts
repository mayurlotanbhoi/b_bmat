//@ts-ignore
export const validate = (schema) => async (req, res, next) => {
    try {
        req.body = await schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        next();
    } catch (err) {
        res.status(400).json({
            success: false,
            message: "Validation Error",
            //@ts-ignore
            errors: err.inner.map((e) => ({
                field: e.path,
                message: e.message,
            })),
        });
    }
};
