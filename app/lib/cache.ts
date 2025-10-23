// lib/cache.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const CACHE_TTL = 300; // 5 minutes

export async function getCachedBlogPosts(page, category, search) {
  const cacheKey = `blog:${page}:${category}:${search}`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (error) {
    console.error('Cache read error:', error);
  }
  
  return null;
}

export async function setCachedBlogPosts(page, category, search, data) {
  const cacheKey = `blog:${page}:${category}:${search}`;
  
  try {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}
