use std::collections::HashMap;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

/// Simple sliding-window rate limiter keyed by username.
#[derive(Clone)]
pub struct LoginRateLimiter {
    inner: std::sync::Arc<Mutex<HashMap<String, Vec<Instant>>>>,
    max_requests: usize,
    window: Duration,
}

impl LoginRateLimiter {
    pub fn new(max_requests: usize, window: Duration) -> Self {
        Self {
            inner: std::sync::Arc::new(Mutex::new(HashMap::new())),
            max_requests,
            window,
        }
    }

    /// Returns `true` if the request is allowed, `false` if rate-limited.
    pub async fn check(&self, username: &str) -> bool {
        let mut map = self.inner.lock().await;
        let now = Instant::now();

        // Periodic cleanup to prevent unbounded growth
        if map.len() > 1000 {
            let window = self.window;
            map.retain(|_, timestamps| {
                timestamps.retain(|t| now.duration_since(*t) < window);
                !timestamps.is_empty()
            });
        }

        let timestamps = map.entry(username.to_string()).or_default();
        timestamps.retain(|t| now.duration_since(*t) < self.window);

        if timestamps.len() < self.max_requests {
            timestamps.push(now);
            true
        } else {
            false
        }
    }
}
