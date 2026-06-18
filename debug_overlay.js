// Debug overlay that draws thick white border around the world bounds (world-space)
(function () {
    window.DebugOverlay = {
        state: {
            g: null,
            thickness: 6
        },

        init: function (scene) {
            // graphics as a screen-space overlay so border remains visible
            const g = scene.add.graphics({ x: 0, y: 0 }).setScrollFactor(0).setDepth(2000);
            this.state.g = g;
            this.state.thickness = 6;
            // add a HUD text to display world/camera values
            const hud = scene.add.text(12, 12, '', {
                fontFamily: "'Courier New', monospace",
                fontSize: '12px',
                color: '#ffffff',
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: { x: 6, y: 4 }
            }).setScrollFactor(0).setDepth(2001);
            this.state.hud = hud;

            // cleanup when scene shuts down
            scene.events.once('shutdown', () => {
                if (this.state.g) {
                    this.state.g.destroy();
                    this.state.g = null;
                }
                if (this.state.hud) {
                    this.state.hud.destroy();
                    this.state.hud = null;
                }
            });
        },

        update: function (scene) {
            if (!this.state.g) return;
            const g = this.state.g;
            g.clear();
            const cam = scene.cameras.main;
            const worldW = scene.scale.width * GameObjects.world.scale;
            const worldH = scene.scale.height * GameObjects.world.scale;

            // compute world rect mapped to screen coordinates
            const screenX = Math.round((0 - cam.scrollX) * cam.zoom + cam.x);
            const screenY = Math.round((0 - cam.scrollY) * cam.zoom + cam.y);
            const screenW = Math.round(worldW * cam.zoom);
            const screenH = Math.round(worldH * cam.zoom);

            // draw thick white border in screen space so it's always visible
            g.lineStyle(this.state.thickness, 0xffffff, 1);
            g.strokeRect(screenX - this.state.thickness / 2, screenY - this.state.thickness / 2, screenW + this.state.thickness, screenH + this.state.thickness);

            // update HUD with values useful for verifying clamping
            if (this.state.hud) {
                const worldW = scene.scale.width * GameObjects.world.scale;
                const worldH = scene.scale.height * GameObjects.world.scale;
                const viewW = cam.width / cam.zoom;
                const viewH = cam.height / cam.zoom;
                const maxScrollX = worldW - viewW;
                const maxScrollY = worldH - viewH;
                const lines = [
                    `world: ${Math.round(worldW)} x ${Math.round(worldH)}`,
                    `view: ${Math.round(viewW)} x ${Math.round(viewH)} (zoom ${cam.zoom.toFixed(2)})`,
                    `scroll: ${cam.scrollX.toFixed(2)}, ${cam.scrollY.toFixed(2)}`,
                    `maxScroll: ${maxScrollX.toFixed(2)}, ${maxScrollY.toFixed(2)}`
                ];
                this.state.hud.setText(lines.join('\n'));
            }
        }
    };
})();

