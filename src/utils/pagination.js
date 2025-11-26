const paginate = (data, page = 1, limit = 10) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  
  const total = data.length;
  const totalPages = Math.ceil(total / limitNum);
  const paginatedData = data.slice(skip, skip + limitNum);
  
  return {
    data: paginatedData,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      itemsPerPage: limitNum,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    }
  };
};

const mongodbPaginate = (query = {}, page = 1, limit = 10, sort = { _id: -1 }) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;
  
  return {
    skip,
    limit: limitNum,
    sort,
    pagination: {
      page: pageNum,
      limit: limitNum
    }
  };
};

module.exports = { paginate, mongodbPaginate };