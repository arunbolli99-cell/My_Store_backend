const rateLimitStore = {};

const RATE_LIMITS = {
    sendOtp: {
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000
    },
    verifyOtp: {
        maxAttempts: 5,
        windowMs: 60 * 60 * 1000
    }
};

const getRateLimitKey = (email, type) => `${type}:${email}`;

const checkRateLimit = (email, type) => {
    const key = getRateLimitKey(email, type);
    const config = RATE_LIMITS[type];
    const now = Date.now();

    if (!rateLimitStore[key]) {
        rateLimitStore[key] = {
            attempts: 0,
            resetTime: now + config.windowMs
        };
    }

    const record = rateLimitStore[key];

    if (now > record.resetTime) {
        record.attempts = 0;
        record.resetTime = now + config.windowMs;
    }

    if (record.attempts >= config.maxAttempts) {
        return {
            allowed: false,
            remainingAttempts: 0,
            resetTime: record.resetTime
        };
    }

    record.attempts += 1;

    return {
        allowed: true,
        remainingAttempts: config.maxAttempts - record.attempts,
        resetTime: record.resetTime
    };
};

const resetRateLimit = (email, type) => {
    const key = getRateLimitKey(email, type);
    delete rateLimitStore[key];
};

module.exports = {
    checkRateLimit,
    resetRateLimit
};
