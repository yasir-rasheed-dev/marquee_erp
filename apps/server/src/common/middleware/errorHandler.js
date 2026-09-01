const ApiResponse = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.code) {
    switch (err.code) {
      case 'P2002':
        const field = err.meta?.target?.[0] || 'field';
        return ApiResponse.error(res, `${field} already exists.`, 409);
      case 'P2003':
        return ApiResponse.error(res, 'Referenced record not found.', 400);
      case 'P2025':
        return ApiResponse.error(res, 'Record not found.', 404);
      default:
        return ApiResponse.error(res, 'Database error occurred.', 500);
    }
  }

  if (err.name === 'ValidationError') {
    return ApiResponse.error(res, 'Validation failed.', 400, err.errors);
  }

  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message || 'Internal server error';
    
  return ApiResponse.error(res, message, err.status || 500);
};

module.exports = errorHandler;