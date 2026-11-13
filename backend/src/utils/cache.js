const store = new Map();

function getCache(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
    }
    return entry.value;
}

function setCache(key, value, ttlMs = 300000) {
    store.set(key, {
        value,
        expiresAt: ttlMs > 0 ? Date.now() + ttlMs : 0
    });
    return value;
}

function invalidateCache(...keys) {
    for (const k of keys) {
        store.delete(k);
    }
}

function clearAllCache() {
    store.clear();
}

module.exports = {
    getCache,
    setCache,
    invalidateCache,
    clearAllCache
};
