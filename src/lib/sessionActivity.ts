import redis from './redis';

// Redis key prefixes
const SESSION_ACTIVITY_PREFIX = 'session:activity:';
const USER_ACTIVITY_INDEX = 'user:activity:index';

export interface UserSessionActivity {
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  name: string;
  lastSeenAt: string; // ISO timestamp
  sessionId?: string;
}

/**
 * Store or update user session activity in Redis
 * This is called on every authenticated request to track last activity
 */
export async function updateUserSessionActivity(
  user: {
    id: string;
    email?: string | null;
    phoneNumber?: string | null;
    name: string;
  },
  sessionId?: string
): Promise<void> {
  const now = new Date().toISOString();
  const activityData: UserSessionActivity = {
    userId: user.id,
    email: user.email || null,
    phoneNumber: user.phoneNumber || null,
    name: user.name,
    lastSeenAt: now,
    sessionId,
  };

  const key = `${SESSION_ACTIVITY_PREFIX}${user.id}`;

  // Store user activity data with 90 days TTL (for cleanup of very old data)
  await redis.set(key, JSON.stringify(activityData), 'EX', 90 * 24 * 60 * 60);

  // Add user ID to sorted set with timestamp as score for efficient querying
  await redis.zadd(USER_ACTIVITY_INDEX, Date.now(), user.id);
}

/**
 * Get session activity for a specific user
 */
export async function getUserSessionActivity(
  userId: string
): Promise<UserSessionActivity | null> {
  const key = `${SESSION_ACTIVITY_PREFIX}${userId}`;
  const data = await redis.get(key);

  if (!data) return null;

  try {
    return JSON.parse(data) as UserSessionActivity;
  } catch {
    return null;
  }
}

/**
 * Get all users who have been inactive for a specified number of days
 * @param inactiveDays Number of days of inactivity
 * @returns Array of user session activities
 */
export async function getInactiveUsers(
  inactiveDays: number
): Promise<UserSessionActivity[]> {
  const cutoffTime = Date.now() - inactiveDays * 24 * 60 * 60 * 1000;

  // Get user IDs whose last activity is before the cutoff time
  const userIds = await redis.zrangebyscore(
    USER_ACTIVITY_INDEX,
    0,
    cutoffTime
  );

  if (userIds.length === 0) return [];

  // Fetch activity data for all inactive users
  const pipeline = redis.pipeline();
  userIds.forEach((userId) => {
    pipeline.get(`${SESSION_ACTIVITY_PREFIX}${userId}`);
  });

  const results = await pipeline.exec();
  const inactiveUsers: UserSessionActivity[] = [];

  if (results) {
    results.forEach((result) => {
      if (result[1]) {
        try {
          const activity = JSON.parse(result[1] as string) as UserSessionActivity;
          inactiveUsers.push(activity);
        } catch {
          // Skip invalid data
        }
      }
    });
  }

  return inactiveUsers;
}

/**
 * Get users inactive for 7 days
 */
export async function getUsersInactiveFor7Days(): Promise<UserSessionActivity[]> {
  return getInactiveUsers(7);
}

/**
 * Get users inactive for 30 days (1 month)
 */
export async function getUsersInactiveFor30Days(): Promise<UserSessionActivity[]> {
  return getInactiveUsers(30);
}

/**
 * Get users within a specific inactivity range (e.g., between 7 and 14 days)
 * Useful for sending different notification tiers
 */
export async function getUsersInactiveInRange(
  minInactiveDays: number,
  maxInactiveDays: number
): Promise<UserSessionActivity[]> {
  const minCutoff = Date.now() - maxInactiveDays * 24 * 60 * 60 * 1000;
  const maxCutoff = Date.now() - minInactiveDays * 24 * 60 * 60 * 1000;

  // Get user IDs whose last activity is within the range
  const userIds = await redis.zrangebyscore(
    USER_ACTIVITY_INDEX,
    minCutoff,
    maxCutoff
  );

  if (userIds.length === 0) return [];

  const pipeline = redis.pipeline();
  userIds.forEach((userId) => {
    pipeline.get(`${SESSION_ACTIVITY_PREFIX}${userId}`);
  });

  const results = await pipeline.exec();
  const users: UserSessionActivity[] = [];

  if (results) {
    results.forEach((result) => {
      if (result[1]) {
        try {
          const activity = JSON.parse(result[1] as string) as UserSessionActivity;
          users.push(activity);
        } catch {
          // Skip invalid data
        }
      }
    });
  }

  return users;
}

/**
 * Get count of active users in the last N days
 */
export async function getActiveUsersCount(days: number): Promise<number> {
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
  return redis.zcount(USER_ACTIVITY_INDEX, cutoffTime, '+inf');
}

/**
 * Get all recently active users (within specified days)
 */
export async function getRecentlyActiveUsers(
  days: number
): Promise<UserSessionActivity[]> {
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

  const userIds = await redis.zrangebyscore(
    USER_ACTIVITY_INDEX,
    cutoffTime,
    '+inf'
  );

  if (userIds.length === 0) return [];

  const pipeline = redis.pipeline();
  userIds.forEach((userId) => {
    pipeline.get(`${SESSION_ACTIVITY_PREFIX}${userId}`);
  });

  const results = await pipeline.exec();
  const users: UserSessionActivity[] = [];

  if (results) {
    results.forEach((result) => {
      if (result[1]) {
        try {
          const activity = JSON.parse(result[1] as string) as UserSessionActivity;
          users.push(activity);
        } catch {
          // Skip invalid data
        }
      }
    });
  }

  return users;
}

/**
 * Remove user activity data (e.g., when user is deleted)
 */
export async function removeUserSessionActivity(userId: string): Promise<void> {
  const key = `${SESSION_ACTIVITY_PREFIX}${userId}`;
  await redis.del(key);
  await redis.zrem(USER_ACTIVITY_INDEX, userId);
}

/**
 * Clean up old entries from the activity index
 * This should be run periodically (e.g., daily cron job)
 */
export async function cleanupOldActivityData(
  olderThanDays: number = 90
): Promise<number> {
  const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

  // Get and remove old user IDs from the sorted set
  const oldUserIds = await redis.zrangebyscore(
    USER_ACTIVITY_INDEX,
    0,
    cutoffTime
  );

  if (oldUserIds.length === 0) return 0;

  // Remove from sorted set
  await redis.zremrangebyscore(USER_ACTIVITY_INDEX, 0, cutoffTime);

  // Remove individual activity records
  const pipeline = redis.pipeline();
  oldUserIds.forEach((userId) => {
    pipeline.del(`${SESSION_ACTIVITY_PREFIX}${userId}`);
  });
  await pipeline.exec();

  return oldUserIds.length;
}
