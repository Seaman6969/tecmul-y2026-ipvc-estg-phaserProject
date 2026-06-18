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
            const worldWidth = scene.scale.width * GameObjects.world.scale;
            const worldHeight = scene.scale.height * GameObjects.world.scale;

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

            const cam = scene.cameras.main;
            cam.setBounds(0, 0, worldWidth, worldHeight);
            cam.centerOn(worldWidth * 0.5, worldHeight * 0.5);

            // helper to keep scroll within valid range for current zoom
            const fixScroll = () => {
                const worldW = scene.scale.width * GameObjects.world.scale;
                const worldH = scene.scale.height * GameObjects.world.scale;
                const viewW = cam.width / cam.zoom;
                const viewH = cam.height / cam.zoom;
                const maxScrollX = worldW - viewW;
                const maxScrollY = worldH - viewH;
                if (maxScrollX <= 0) {
                    cam.scrollX = maxScrollX / 2; // center horizontally when view larger than world
                } else {
                    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, maxScrollX);
                }
                if (maxScrollY <= 0) {
                    cam.scrollY = maxScrollY / 2; // center vertically when view larger than world
                } else {
                    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, maxScrollY);
                }
            };

            // letterbox overlay graphics (screen-space)
            const letterboxG = scene.add.graphics({ x: 0, y: 0 }).setScrollFactor(0).setDepth(1000);
            this.state.letterboxG = letterboxG;

            const updateLetterbox = () => {
                const g = letterboxG;
                g.clear();
                const worldW = scene.scale.width * GameObjects.world.scale;
                const worldH = scene.scale.height * GameObjects.world.scale;
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
                // draw lines from left-bottom to right-top direction
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
                    // Fallback: draw the world rect filled with transparent color (may not fully erase stripes)
                    g.clear();
                    // draw letterbox rectangles manually
                    g.fillStyle(0x2b2b2b, 1);
                    if (left > 0) {
                        g.fillRect(0, 0, left, cam.height);
                        g.fillRect(cam.width - left, 0, left, cam.height);
                    }
                    if (top > 0) {
                        g.fillRect(left, 0, cam.width - left * 2, top);
                        g.fillRect(left, cam.height - top, cam.width - left * 2, top);
                    }
                    // draw stripes on those rectangles
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
                const worldW = scene.scale.width * GameObjects.world.scale;
                const worldH = scene.scale.height * GameObjects.world.scale;
                const viewW = cam.width / cam.zoom;
                const viewH = cam.height / cam.zoom;
                const maxScrollX = worldW - viewW;
                const maxScrollY = worldH - viewH;
                if (maxScrollX <= 0) cam.scrollX = maxScrollX / 2; else cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, maxScrollX);
                if (maxScrollY <= 0) cam.scrollY = maxScrollY / 2; else cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, maxScrollY);
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
                    fixScroll();
                } else if (deltaY < 0) {
                    cam.setZoom(Phaser.Math.Clamp(cam.zoom + this.state.zoomStep, this.state.minZoom, this.state.maxZoom));
                    fixScroll();
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
                        fixScroll();
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
                        fixScroll();
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
                const worldWidth = scene.scale.width * GameObjects.world.scale;
                const worldHeight = scene.scale.height * GameObjects.world.scale;
                const viewW = cam.width / cam.zoom;
                const viewH = cam.height / cam.zoom;
                const maxX = worldWidth - viewW;
                const maxY = worldHeight - viewH;
                if (maxX <= 0) cam.scrollX = maxX / 2; else cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, maxX);
                if (maxY <= 0) cam.scrollY = maxY / 2; else cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, maxY);
            }
            // update letterbox overlay if present
            if (this.state && this.state.updateLetterbox) this.state.updateLetterbox();
        }
    };
})();
