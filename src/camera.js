// Camera controls extracted from game.js
(function () {
    window.CameraControls = {
        state: {
            isMiddleDragging: false,
            dragStartX: 0,
            dragStartY: 0,
            camStartX: 0,
            camStartY: 0,
            minZoom: 0.2,
            maxZoom: 3.0,
            zoomStep: 0.1
        },

        init: function (scene) {
            const cam = scene.cameras.main;

            const getWorldSize = () => ({
                width: scene.scale.width * GameObjects.world.scale,
                height: scene.scale.height * GameObjects.world.scale
            });

            // Use Phaser's native bounds clamping instead of manually tracking
            // scrollX/scrollY by hand. setBounds() is re-checked against the
            // zoom-adjusted viewport on every render, so the camera can never
            // show anything outside the world rect -- no matter what moves it
            // (drag, zoom, keys, or any other code path that touches the
            // camera later, like a pan/shake/follow you add down the line).
            const applyBounds = () => {
                const { width, height } = getWorldSize();
                cam.setBounds(0, 0, width, height);
            };
            applyBounds();

            const worldSize = getWorldSize();
            cam.centerOn(worldSize.width * 0.5, worldSize.height * 0.5);

            // keyboard keys for camera movement
            cameraKeys = scene.input.keyboard.addKeys({
                left: Phaser.Input.Keyboard.KeyCodes.LEFT,
                right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
                up: Phaser.Input.Keyboard.KeyCodes.UP,
                down: Phaser.Input.Keyboard.KeyCodes.DOWN,
                a: Phaser.Input.Keyboard.KeyCodes.A,
                d: Phaser.Input.Keyboard.KeyCodes.D,
                w: Phaser.Input.Keyboard.KeyCodes.W,
                s: Phaser.Input.Keyboard.KeyCodes.S
            });

            cursors = scene.input.keyboard.createCursorKeys();

            // letterbox overlay graphics (screen-space) -- purely cosmetic.
            // It fills the dead space when the viewport shows more than the
            // world (zoomed out past world size). Bounds-clamping above is
            // what keeps the *scroll* correct; this only decorates the gap,
            // it never has to "restrict" anything itself.
            const letterboxG = scene.add.graphics({ x: 0, y: 0 }).setScrollFactor(0).setDepth(1000);
            this.state.letterboxG = letterboxG;

            const updateLetterbox = () => {
                const g = letterboxG;
                g.clear();
                const { width: worldW, height: worldH } = getWorldSize();
                const worldRenderedW = Math.min(worldW * cam.zoom, cam.width);
                const worldRenderedH = Math.min(worldH * cam.zoom, cam.height);
                const left = Math.max(0, Math.round((cam.width - worldRenderedW) / 2));
                const top = Math.max(0, Math.round((cam.height - worldRenderedH) / 2));
                if (left === 0 && top === 0) return; // no letterbox

                // draw base dark grey over entire screen
                g.fillStyle(0x2b2b2b, 1);
                g.fillRect(0, 0, cam.width, cam.height);

                // draw diagonal stripes across full screen
                g.lineStyle(2, 0x000000, 0.6);
                const spacing = 18;
                for (let i = -cam.height; i < cam.width + cam.height; i += spacing) {
                    g.beginPath();
                    g.moveTo(i, cam.height);
                    g.lineTo(i + cam.height, 0);
                    g.closePath();
                    g.strokePath();
                }

                // erase the world rectangle from the overlay so the stripes only show in letterbox
                if (Phaser.BlendModes && Phaser.BlendModes.ERASE) {
                    g.setBlendMode(Phaser.BlendModes.ERASE);
                    g.fillStyle(0xffffff, 1);
                    g.fillRect(left, top, cam.width - left * 2, cam.height - top * 2);
                    g.setBlendMode(Phaser.BlendModes.NORMAL);
                } else {
                    // Fallback: draw letterbox rectangles manually
                    g.clear();
                    g.fillStyle(0x2b2b2b, 1);
                    if (left > 0) {
                        g.fillRect(0, 0, left, cam.height);
                        g.fillRect(cam.width - left, 0, left, cam.height);
                    }
                    if (top > 0) {
                        g.fillRect(left, 0, cam.width - left * 2, top);
                        g.fillRect(left, cam.height - top, cam.width - left * 2, top);
                    }
                    g.lineStyle(2, 0x000000, 0.6);
                    const areas = [];
                    if (left > 0) areas.push({ x: 0, y: 0, w: left, h: cam.height }, { x: cam.width - left, y: 0, w: left, h: cam.height });
                    if (top > 0) areas.push({ x: left, y: 0, w: cam.width - left * 2, h: top }, { x: left, y: cam.height - top, w: cam.width - left * 2, h: top });
                    areas.forEach((rect) => {
                        for (let i = rect.x - rect.h; i < rect.x + rect.w + rect.h; i += spacing) {
                            g.beginPath();
                            g.moveTo(i, rect.y + rect.h);
                            g.lineTo(i + rect.h, rect.y);
                            g.strokePath();
                        }
                    });
                }
            };
            this.state.updateLetterbox = updateLetterbox;

            // cleanup when scene shuts down
            scene.events.once('shutdown', () => {
                if (this.state.letterboxG) {
                    this.state.letterboxG.destroy();
                    this.state.letterboxG = null;
                }
            });

            // Recompute bounds whenever the canvas resizes, since world size is
            // derived from scene.scale.width/height. This is the case the old
            // code missed entirely: bounds were only ever recalculated
            // reactively (after a drag/zoom/pan), never on resize, so a resize
            // could leave the camera looking at stale bounds until the next
            // interaction happened to fix it.
            scene.scale.on('resize', applyBounds);
            scene.events.once('shutdown', () => scene.scale.off('resize', applyBounds));

            // Middle-mouse dragging
            scene.input.on('pointerdown', (pointer) => {
                if (pointer.middleButtonDown()) {
                    if (pointer.event && pointer.event.preventDefault) pointer.event.preventDefault();
                    this.state.isMiddleDragging = true;
                    this.state.dragStartX = pointer.x;
                    this.state.dragStartY = pointer.y;
                    this.state.camStartX = cam.scrollX;
                    this.state.camStartY = cam.scrollY;
                }
            });

            scene.input.on('pointerup', (pointer) => {
                if (!pointer.middleButtonDown()) {
                    this.state.isMiddleDragging = false;
                }
            });

            scene.input.on('pointermove', (pointer) => {
                if (!this.state.isMiddleDragging) return;
                const dx = pointer.x - this.state.dragStartX;
                const dy = pointer.y - this.state.dragStartY;
                cam.scrollX = this.state.camStartX - dx / cam.zoom;
                cam.scrollY = this.state.camStartY - dy / cam.zoom;
                // no manual clamp needed -- cam.setBounds enforces this every render
            });

            // Wheel to zoom (Shift+wheel adjusts gravityMass)
            scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
                const event = pointer.event || {};
                if (event.shiftKey) {
                    if (deltaY > 0) {
                        gravityMass -= G;
                    } else if (deltaY < 0) {
                        gravityMass += G;
                    }
                    gravityMass = Phaser.Math.Clamp(gravityMass, -500000000, 500000000);
                    if (typeof massText !== 'undefined') massText.setText("Black Hole Mass: " + gravityMass);
                    if (typeof massText !== 'undefined') {
                        if (gravityMass > 0) massText.setFill("#00ffff");
                        else if (gravityMass < 0) massText.setFill("#ff4500");
                        else massText.setFill("#00ff00");
                    }
                    return;
                }

                if (deltaY > 0) {
                    cam.setZoom(Phaser.Math.Clamp(cam.zoom - this.state.zoomStep, this.state.minZoom, this.state.maxZoom));
                } else if (deltaY < 0) {
                    cam.setZoom(Phaser.Math.Clamp(cam.zoom + this.state.zoomStep, this.state.minZoom, this.state.maxZoom));
                }
            });

            // Keyboard for zoom and legacy gravity mass controls
            scene.input.keyboard.on('keydown', (event) => {
                const key = event.key;
                if (key === '+' || key === '=') {
                    if (event.shiftKey) {
                        gravityMass += G;
                        gravityMass = Phaser.Math.Clamp(gravityMass, -5000000, 5000000);
                        if (typeof massText !== 'undefined') massText.setText("Black Hole Mass: " + gravityMass);
                        if (typeof massText !== 'undefined') {
                            if (gravityMass > 0) massText.setFill("#00ffff");
                            else if (gravityMass < 0) massText.setFill("#ff4500");
                            else massText.setFill("#00ff00");
                        }
                    } else {
                        cam.setZoom(Phaser.Math.Clamp(cam.zoom + this.state.zoomStep, this.state.minZoom, this.state.maxZoom));
                    }
                } else if (key === '-') {
                    if (event.shiftKey) {
                        gravityMass -= G;
                        gravityMass = Phaser.Math.Clamp(gravityMass, -5000000, 5000000);
                        if (typeof massText !== 'undefined') massText.setText("Black Hole Mass: " + gravityMass);
                        if (typeof massText !== 'undefined') {
                            if (gravityMass > 0) massText.setFill("#00ffff");
                            else if (gravityMass < 0) massText.setFill("#ff4500");
                            else massText.setFill("#00ff00");
                        }
                    } else {
                        cam.setZoom(Phaser.Math.Clamp(cam.zoom - this.state.zoomStep, this.state.minZoom, this.state.maxZoom));
                    }
                } else if (key === 'ArrowUp') {
                    gravityMass += G;
                } else if (key === 'ArrowDown') {
                    gravityMass -= G;
                } else if (key === '0') {
                    gravityMass = 0;
                    if (typeof massText !== 'undefined') massText.setText("Black Hole Mass: " + gravityMass);
                    if (typeof massText !== 'undefined') massText.setFill("#00ff00");
                }
            }, scene);
        },

        update: function (scene) {
            const cam = scene.cameras.main;
            let camMoveX = 0;
            let camMoveY = 0;
            if ((cursors && cursors.left && cursors.left.isDown) || (cameraKeys && cameraKeys.left && cameraKeys.left.isDown)) {
                camMoveX -= 1;
            }
            if ((cursors && cursors.right && cursors.right.isDown) || (cameraKeys && cameraKeys.right && cameraKeys.right.isDown)) {
                camMoveX += 1;
            }
            if ((cursors && cursors.up && cursors.up.isDown) || (cameraKeys && cameraKeys.up && cameraKeys.up.isDown)) {
                camMoveY -= 1;
            }
            if ((cursors && cursors.down && cursors.down.isDown) || (cameraKeys && cameraKeys.down && cameraKeys.down.isDown)) {
                camMoveY += 1;
            }
            if (camMoveX !== 0 || camMoveY !== 0) {
                const deltaSeconds = Math.max(scene.game.loop.delta, 1) / 1000;
                cam.scrollX += camMoveX * GameObjects.camera.speed * deltaSeconds;
                cam.scrollY += camMoveY * GameObjects.camera.speed * deltaSeconds;
                // no manual clamp needed -- cam.setBounds enforces this every render
            }
            // update letterbox overlay if present
            if (this.state && this.state.updateLetterbox) this.state.updateLetterbox();
        }
    };
})();