// Debug overlay that draws thick white border around the world bounds (world-space)
(function () {
    window.DebugOverlay = {
        state: {
            g: null,
            thickness: 6
        },

        init: function (scene) {
            // Use an HTML overlay for debug text instead of Phaser canvas text.
            let hud = document.getElementById('debug-overlay');
            hud.style.height = 'auto';
            hud.style.width = 'auto';
            hud.style.background = 'rgba(255, 255, 255, 0.6)';
            hud.style.position = 'absolute';
            hud.style.top = '8px';
            hud.style.left = '8px';
            let created = false;
            if (!hud) {
                hud = document.createElement('div');
                hud.id = 'debug-overlay';
                // default styles; user can override in index.html or external CSS
                hud.style.position = 'absolute';
                hud.style.top = '8px';
                hud.style.left = '8px';
                hud.style.zIndex = 9999;
                hud.style.color = '#ffffff';
                hud.style.background = 'rgba(0,0,0,0.6)';
                hud.style.padding = '6px 8px';
                hud.style.fontFamily = "'Courier New', monospace";
                hud.style.fontSize = '12px';
                hud.style.whiteSpace = 'pre';
                hud.style.pointerEvents = 'none';
                document.body.appendChild(hud);
                created = true;
            }

            this.state.hud = hud;
            this.state._hudCreated = created;

            // cleanup when scene shuts down
            scene.events.once('shutdown', () => {
                if (this.state._hudCreated && this.state.hud) {
                    this.state.hud.remove();
                    this.state.hud = null;
                }
            });
        },

        update: function (scene) {
            const cam = scene.cameras.main;
            if (!this.state.hud || !cam) return;

            const worldW = (scene.scale && scene.scale.width ? scene.scale.width : (scene.sys && scene.sys.game && scene.sys.game.config && scene.sys.game.config.width) || window.innerWidth) * GameObjects.world.scale;
            const worldH = (scene.scale && scene.scale.height ? scene.scale.height : (scene.sys && scene.sys.game && scene.sys.game.config && scene.sys.game.config.height) || window.innerHeight) * GameObjects.world.scale;

            const viewW = cam.width / cam.zoom;
            const viewH = cam.height / cam.zoom;
            const maxScrollX = worldW - viewW;
            const maxScrollY = worldH - viewH;
            // FPS / timing
            const loop = scene.game && scene.game.loop;
            const fpsVal = loop && loop.actualFps ? loop.actualFps : (loop && loop.delta ? (1000 / loop.delta) : 0);
            const msPerFrame = loop && loop.delta ? loop.delta.toFixed(1) : '0.0';
            const lines = [
                `fps: ${fpsVal.toFixed ? fpsVal.toFixed(1) : Number(fpsVal).toFixed(1)} (${msPerFrame} ms)` ,
                `world: ${Math.round(worldW)} x ${Math.round(worldH)}`,
                `view: ${Math.round(viewW)} x ${Math.round(viewH)} (zoom ${cam.zoom.toFixed(2)})`,
                `scroll: ${cam.scrollX.toFixed(2)}, ${cam.scrollY.toFixed(2)}`,
                `maxScroll: ${maxScrollX.toFixed(2)}, ${maxScrollY.toFixed(2)}`
            ];

            // pointer / cursor info
            const pointer = scene.input.activePointer || {};
            const canvas = scene.game && scene.game.canvas;
            let clientPos = '(n/a)';
            if (canvas && pointer && typeof pointer.event !== 'undefined' && pointer.event) {
                const rect = canvas.getBoundingClientRect();
                const cx = (pointer.event.clientX - rect.left).toFixed(0);
                const cy = (pointer.event.clientY - rect.top).toFixed(0);
                clientPos = `${cx}, ${cy}`;
            }

            const canvasPos = (typeof pointer.x !== 'undefined' && typeof pointer.y !== 'undefined') ? `${pointer.x.toFixed(0)}, ${pointer.y.toFixed(0)}` : '(n/a)';
            const worldPos = (typeof pointer.worldX !== 'undefined' && typeof pointer.worldY !== 'undefined') ? `${pointer.worldX.toFixed(0)}, ${pointer.worldY.toFixed(0)}` : '(n/a)';

            lines.push(`pointer(canvas): ${canvasPos}`);
            lines.push(`pointer(client): ${clientPos}`);
            lines.push(`pointer(world): ${worldPos}`);

            this.state.hud.innerText = lines.join('\n');
        }
    };
})();

