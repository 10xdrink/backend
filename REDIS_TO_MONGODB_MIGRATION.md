# Redis to MongoDB Session Migration

## Overview
This document outlines the migration from Redis-based session management to MongoDB-based session management in the 10X backend application.

## Migration Date
November 14, 2025

## Changes Made

### 1. New Dependencies
- **Added**: `connect-mongodb-session` - Provides MongoDB-backed session storage for Express

### 2. New Files Created
- `config/mongoSession.js` - MongoDB session store configuration

### 3. Modified Files

#### `app.js`
- Removed Redis client initialization code
- Replaced `connect-redis` with `connect-mongodb-session`
- Updated session configuration to use MongoDB store
- Sessions are now stored in MongoDB collection named `sessions`

#### `config/redis.js`
- Added deprecation notice
- Clarified that Redis is still used for BullMQ job queues
- Redis is NO LONGER used for session management

#### `services/sessionService.js`
- Removed Redis dependencies
- Updated `regenerateSessionToken()` to be simpler (returns JWT directly)
- Updated `checkActiveSession()` to work with MongoDB session store
- Removed `setSessionExpiration()` (handled automatically by MongoDB store)

#### `services/redisService.js`
- Converted to no-op service (functions do nothing)
- All cache functions now return immediately without errors
- Added deprecation notices and suggestions for MongoDB-based caching

#### `.env`
- Added comment clarifying Redis is only for BullMQ job queues
- Added `SESSION_SECRET` configuration for MongoDB sessions

### 4. Session Storage Details

**Previous (Redis)**:
- Sessions stored in Redis with `session:` prefix
- Required external Redis server
- Used `connect-redis` package

**Current (MongoDB)**:
- Sessions stored in MongoDB `sessions` collection
- Uses existing MongoDB connection
- Automatic cleanup of expired sessions
- Session expiration: 24 hours (configurable in `config/mongoSession.js`)

## What Still Uses Redis?

Redis is still required for the following:
- **BullMQ Job Queues**: Email jobs, payment jobs, and report jobs
- All job-related functionality in `jobs/` directory

If you want to completely remove Redis, you'll need to:
1. Replace BullMQ with an alternative queue system (e.g., Agenda, Bull with MongoDB)
2. Update all job files in the `jobs/` directory

## Caching

The Redis caching functionality (`setCache`, `getCache`, `deleteCache`) has been converted to no-op functions. This means:
- No errors will occur in existing code
- Caching is effectively disabled
- Consider implementing MongoDB-based caching if needed for performance

## Testing

After migration, ensure:
1. ✅ Users can log in successfully
2. ✅ Sessions persist across requests
3. ✅ Sessions expire after 24 hours
4. ✅ MongoDB `sessions` collection is created
5. ✅ BullMQ jobs still work (emails, payments, reports)

## MongoDB Session Store Configuration

Located in `config/mongoSession.js`:
```javascript
{
  uri: process.env.MONGO_URI,
  collection: 'sessions',
  expires: 1000 * 60 * 60 * 24, // 24 hours
}
```

## Rollback Instructions

If you need to rollback to Redis sessions:

1. Restore original `app.js` Redis initialization code
2. Restore original `services/sessionService.js`
3. Restore original `services/redisService.js`
4. Remove `config/mongoSession.js`
5. Uninstall `connect-mongodb-session`
6. Reinstall `connect-redis`

## Benefits of MongoDB Sessions

1. **Simplified Infrastructure**: One less external service to manage
2. **Unified Data Storage**: All application data in one place
3. **Automatic Cleanup**: MongoDB TTL indexes handle expired sessions
4. **Better for Small-Medium Scale**: Easier to deploy and maintain
5. **Cost Effective**: No need for separate Redis instance for sessions

## Performance Considerations

- MongoDB sessions may be slightly slower than Redis for very high traffic
- For most applications, the difference is negligible
- If scaling issues arise, consider adding indexes to the sessions collection

## Support

For questions or issues related to this migration, contact the development team.
