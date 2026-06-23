// TurnManager: controls simulation turns with min/max durations
(function(){
  function TurnManager() {
    this.scene = null;
    this.running = false;
    this.startTs = 0;
    this.minMs = 0;
    this.maxMs = 0;
    this.endRequested = false;
    this.onStart = null;
    this.onEnd = null;
  }

  TurnManager.prototype.init = function(scene) {
    this.scene = scene;
  };

  TurnManager.prototype.startTurn = function(minMs, maxMs) {
    this.running = true;
    this.startTs = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    this.minMs = Math.max(0, Number(minMs) || 0);
    this.maxMs = (maxMs === undefined || maxMs === null) ? this.minMs : Math.max(0, Number(maxMs) || 0);
    this.endRequested = false;
    if (typeof this.onStart === 'function') {
      try { this.onStart(); } catch (e) { console.warn('TurnManager.onStart handler threw', e); }
    }
  };

  TurnManager.prototype.requestEnd = function() {
    this.endRequested = true;
  };

  TurnManager.prototype.forceEnd = function() {
    if (this.running) this._end();
  };

  TurnManager.prototype._end = function() {
    this.running = false;
    this.startTs = 0;
    this.minMs = 0;
    this.maxMs = 0;
    this.endRequested = false;
    if (typeof this.onEnd === 'function') {
      try { this.onEnd(); } catch (e) { console.warn('TurnManager.onEnd handler threw', e); }
    }
  };

  TurnManager.prototype.update = function() {
    if (!this.running) return;
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const elapsed = now - this.startTs;
    // must run at least minMs
    if (elapsed < this.minMs) return;
    // if end requested after min or we've hit max, end
    if (this.endRequested || (this.maxMs > 0 && elapsed >= this.maxMs)) {
      this._end();
    }
  };

  TurnManager.prototype.isRunning = function() {
    return !!this.running;
  };

  // simple helpers for debugging / UI wiring
  TurnManager.prototype.setOnStart = function(fn) { this.onStart = fn; };
  TurnManager.prototype.setOnEnd = function(fn) { this.onEnd = fn; };

  // expose a singleton
  window.TurnManagerClass = TurnManager;
  window.TurnManager = new TurnManager();
})();
