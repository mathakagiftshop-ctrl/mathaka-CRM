/**
 * Centralized Error Handler Middleware
 * Provides consistent error responses and logging
 */

// Custom error class for application errors
export class AppError extends Error {
    constructor(message, statusCode = 500, code = 'SERVER_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Common error types
export const ErrorTypes = {
    VALIDATION_ERROR: (message) => new AppError(message || 'Validation failed', 400, 'VALIDATION_ERROR'),
    NOT_FOUND: (entity = 'Resource') => new AppError(`${entity} not found`, 404, 'NOT_FOUND'),
    UNAUTHORIZED: (message) => new AppError(message || 'Not authorized', 401, 'UNAUTHORIZED'),
    FORBIDDEN: (message) => new AppError(message || 'Access forbidden', 403, 'FORBIDDEN'),
    DUPLICATE: (field) => new AppError(`${field} already exists`, 409, 'DUPLICATE'),
    SERVER_ERROR: (message) => new AppError(message || 'Internal server error', 500, 'SERVER_ERROR')
};

// Logger function
const logError = (err, req) => {
    const timestamp = new Date().toISOString();
    const { method, url, body, user } = req;

    console.error(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 ERROR [${timestamp}]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Method: ${method}
URL: ${url}
User: ${user?.username || 'anonymous'}
Status: ${err.statusCode || 500}
Code: ${err.code || 'UNKNOWN'}
Message: ${err.message}
${err.stack ? `Stack: ${err.stack}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
};

// Main error handler middleware
export const errorHandler = (err, req, res, next) => {
    // Log the error
    logError(err, req);

    // Default values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'An unexpected error occurred';
    let code = err.code || 'SERVER_ERROR';

    // Handle specific error types
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    } else if (err.code === '23505') {
        // PostgreSQL unique violation
        statusCode = 409;
        message = 'A record with this value already exists';
        code = 'DUPLICATE';
    } else if (err.code === '23503') {
        // PostgreSQL foreign key violation
        statusCode = 400;
        message = 'Referenced record does not exist';
        code = 'FOREIGN_KEY_VIOLATION';
    }

    // Send error response
    const response = {
        success: false,
        error: {
            message,
            code,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    };

    res.status(statusCode).json(response);
};

// Async handler wrapper to catch async errors
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Not found handler
export const notFoundHandler = (req, res, next) => {
    next(new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
};

export default errorHandler;
