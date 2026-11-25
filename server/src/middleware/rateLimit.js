// Single-process protection for the college deployment. Use a shared store when scaling replicas.
function rateLimit({ limit = 30, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
  const buckets = new Map()
  return (req, res, next) => {
    const timestamp = now()
    for (const [key, bucket] of buckets) if (bucket.resetAt <= timestamp) buckets.delete(key)
    const key = req.ip
    const bucket = buckets.get(key) || { count: 0, resetAt: timestamp + windowMs }
    buckets.set(key, bucket)
    bucket.count += 1
    if (bucket.count <= limit) return next()
    res.set('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1000))))
    return res.status(429).json({ error: { message: 'Too many attempts. Please try again later.' } })
  }
}
module.exports = { rateLimit }
