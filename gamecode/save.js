
(function () {
    // Expose a simple manager on window for game saves
    class GameSaveManager {
        constructor() {
            this.db = new databaseDB();
            this.ready = false;
        }
        async init() {
            if (this.ready) return true;
            try {
                await this.db.init();
                this.ready = true;
                return true;
            } catch (e) {
                console.error('GameSaveManager.init failed', e);
                return false;
            }
        }
        // list all save slot keys
        async list() {
            if (!this.ready) await this.init();
            try {
                return await this.db.getAllKeys();
            } catch (e) {
                console.error(e);
                return [];
            }
        }
        // get a save by name (returns parsed object or null)
        async get(name) {
            if (!this.ready) await this.init();
            try {
                const raw = await this.db.readItem(name);
                if (raw === null || raw === undefined) return null;
                try { return JSON.parse(raw); } catch { return raw; }
            } catch (e) {
                console.error(e);
                return null;
            }
        }
        // set save data for a slot (overwrites)
        async set(name, obj) {
            if (!this.ready) await this.init();
            try {
                const payload = JSON.stringify(obj);
                return await this.db.createItem(name, payload);
            } catch (e) {
                console.error(e);
                return false;
            }
        }
        // remove a save slot
        async remove(name) {
            if (!this.ready) await this.init();
            try {
                return await this.db.deleteItem(name);
            } catch (e) {
                console.error(e);
                return false;
            }
        }
        // clear all saves (delete every key)
        async clearAll() {
            if (!this.ready) await this.init();
            try {
                const keys = await this.list();
                for (const k of keys) await this.remove(k);
                return true;
            } catch (e) {
                console.error(e);
                return false;
            }
        }
        close() {
            try { this.db = null; } catch {}
            this.ready = false;
        }
    }

    // Attach to window for easy use in game code
    if (typeof window !== 'undefined') {
        if(window.GameSaves !== undefined) return;
        window.GameSaves = new GameSaveManager();
    }
})