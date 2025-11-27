// Spatial Grid System for efficient proximity queries
// Dramatically reduces O(n^2) distance calculations to O(n) with grid-based lookup

class SpatialGrid {
    constructor(cellSize = 500) {
        this.cellSize = cellSize;
        this.grid = new Map();
        this.entityPositions = new Map(); // Track which cell each entity is in
    }

    // Get cell key from position
    getCellKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }

    // Add or update an entity in the grid
    updateEntity(entityId, x, y, entity) {
        const newKey = this.getCellKey(x, y);
        const oldKey = this.entityPositions.get(entityId);

        // Remove from old cell if position changed
        if (oldKey && oldKey !== newKey) {
            const oldCell = this.grid.get(oldKey);
            if (oldCell) {
                oldCell.delete(entityId);
                if (oldCell.size === 0) {
                    this.grid.delete(oldKey);
                }
            }
        }

        // Add to new cell
        if (!this.grid.has(newKey)) {
            this.grid.set(newKey, new Map());
        }
        this.grid.get(newKey).set(entityId, entity);
        this.entityPositions.set(entityId, newKey);
    }

    // Remove entity from grid
    removeEntity(entityId) {
        const key = this.entityPositions.get(entityId);
        if (key) {
            const cell = this.grid.get(key);
            if (cell) {
                cell.delete(entityId);
                if (cell.size === 0) {
                    this.grid.delete(key);
                }
            }
            this.entityPositions.delete(entityId);
        }
    }

    // Get all entities within radius of a point
    getNearbyEntities(x, y, radius) {
        const results = [];
        const cellRadius = Math.ceil(radius / this.cellSize);
        const centerCellX = Math.floor(x / this.cellSize);
        const centerCellY = Math.floor(y / this.cellSize);
        const radiusSquared = radius * radius;

        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                const key = `${centerCellX + dx},${centerCellY + dy}`;
                const cell = this.grid.get(key);
                if (cell) {
                    cell.forEach((entity, entityId) => {
                        // Quick distance check using squared distance (avoid sqrt)
                        const ex = entity.position ? entity.position.x : entity.x;
                        const ey = entity.position ? entity.position.y : entity.y;
                        const distSquared = (ex - x) * (ex - x) + (ey - y) * (ey - y);
                        if (distSquared <= radiusSquared) {
                            results.push({ entity, entityId, distSquared });
                        }
                    });
                }
            }
        }

        return results;
    }

    // Get nearest entity to a point
    getNearestEntity(x, y, maxRadius = Infinity, filter = null) {
        let nearest = null;
        let nearestDistSquared = maxRadius * maxRadius;

        const entities = this.getNearbyEntities(x, y, maxRadius);
        for (const { entity, entityId, distSquared } of entities) {
            if (distSquared < nearestDistSquared) {
                if (!filter || filter(entity, entityId)) {
                    nearestDistSquared = distSquared;
                    nearest = { entity, entityId, distance: Math.sqrt(distSquared) };
                }
            }
        }

        return nearest;
    }

    // Clear all entities
    clear() {
        this.grid.clear();
        this.entityPositions.clear();
    }

    // Get stats for debugging
    getStats() {
        let totalEntities = 0;
        this.grid.forEach(cell => {
            totalEntities += cell.size;
        });
        return {
            cellCount: this.grid.size,
            entityCount: totalEntities,
            avgEntitiesPerCell: this.grid.size > 0 ? totalEntities / this.grid.size : 0
        };
    }
}

// Object Pool for reusing enemy/minion objects to reduce GC pressure
class ObjectPool {
    constructor(factory, initialSize = 100) {
        this.factory = factory;
        this.pool = [];
        this.activeCount = 0;

        // Pre-allocate initial objects
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.factory());
        }
    }

    acquire() {
        this.activeCount++;
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return this.factory();
    }

    release(obj) {
        this.activeCount--;
        if (obj.reset && typeof obj.reset === 'function') {
            obj.reset();
        }
        this.pool.push(obj);
    }

    getStats() {
        return {
            poolSize: this.pool.length,
            activeCount: this.activeCount,
            totalCreated: this.pool.length + this.activeCount
        };
    }
}

// In-memory cache with TTL
class GameCache {
    constructor(defaultTTL = 300000) { // 5 minutes default
        this.cache = new Map();
        this.defaultTTL = defaultTTL;

        // Cleanup expired entries every minute
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000);
    }

    set(key, value, ttl = this.defaultTTL) {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttl
        });
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    has(key) {
        return this.get(key) !== null;
    }

    delete(key) {
        return this.cache.delete(key);
    }

    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
        }
    }

    clear() {
        this.cache.clear();
    }

    getStats() {
        return {
            size: this.cache.size,
            memoryEstimate: `${(this.cache.size * 200 / 1024).toFixed(1)}KB` // Rough estimate
        };
    }

    destroy() {
        clearInterval(this.cleanupInterval);
        this.cache.clear();
    }
}

// Batched database writer to reduce DB load
class BatchedWriter {
    constructor(writeFunction, batchSize = 50, flushInterval = 5000) {
        this.writeFunction = writeFunction;
        this.batchSize = batchSize;
        this.flushInterval = flushInterval;
        this.queue = [];
        this.isProcessing = false;

        // Auto-flush at intervals
        this.flushTimer = setInterval(() => {
            this.flush();
        }, flushInterval);
    }

    add(item) {
        this.queue.push(item);

        // Flush if batch is full
        if (this.queue.length >= this.batchSize) {
            this.flush();
        }
    }

    async flush() {
        if (this.queue.length === 0 || this.isProcessing) return;

        this.isProcessing = true;
        const batch = this.queue.splice(0, this.batchSize);

        try {
            await this.writeFunction(batch);
            console.log(`💾 Batch write: ${batch.length} items`);
        } catch (error) {
            console.error('❌ Batch write failed:', error.message);
            // Re-queue failed items
            this.queue.unshift(...batch);
        } finally {
            this.isProcessing = false;
        }
    }

    getStats() {
        return {
            queueSize: this.queue.length,
            isProcessing: this.isProcessing
        };
    }

    destroy() {
        clearInterval(this.flushTimer);
        // Final flush
        this.flush();
    }
}

module.exports = {
    SpatialGrid,
    ObjectPool,
    GameCache,
    BatchedWriter
};
