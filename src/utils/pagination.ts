// utils/pagination.ts

interface PaginationParams {
    model: any; // Mongoose model
    filter?: object;
    page?: number;
    pageSize?: number;
    sort?: object;
    populate?: string | object | (string | object)[];
}

 const paginateQuery = async ({
    model,
    filter = {},
    page = 1,
    pageSize = 10,
    sort = { createdAt: -1 },
    populate,
}: PaginationParams) => {
    const skip = (page - 1) * pageSize;

    const query = model.find(filter).skip(skip).limit(pageSize).sort(sort);

    if (populate) {
        query.populate(populate);
    }

    const [results, total] = await Promise.all([
        query.exec(),
        model.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
        results,
        pagination: {
            total,
            currentPage: page,
            pageSize,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
};

export default  paginateQuery
