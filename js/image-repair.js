// Simple client-side image repair / watermark removal helpers
// Uses Canvas API. For full MI-GAN quality, swap processMask with ONNX call later.

window.ImageRepair = {
    _canvas: null,
    _ctx: null,
    _maskCanvas: null,
    _maskCtx: null,
    _img: null,
    _drawing: false,
    _mode: 'brush', // brush | eraser
    _brushSize: 24,
    _scale: 1,
    _origW: 0,
    _origH: 0,
    _outputMode: 'inpaint',
    _resultDataUrl: null,

    init(canvasId, maskCanvasId) {
        this._canvas = document.getElementById(canvasId);
        this._maskCanvas = document.getElementById(maskCanvasId);
        if (!this._canvas || !this._maskCanvas) return false;
        // Explicitly request alpha channel so erase/transparent mode works
        this._ctx = this._canvas.getContext('2d', { alpha: true, willReadFrequently: false });
        this._maskCtx = this._maskCanvas.getContext('2d', { alpha: true, willReadFrequently: true });
        this._bindEvents();
        return true;
    },

    _bindEvents() {
        const c = this._canvas;
        const getPos = (e) => {
            const rect = c.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left) * (c.width / rect.width),
                y: (clientY - rect.top) * (c.height / rect.height)
            };
        };

        const start = (e) => {
            e.preventDefault();
            this._drawing = true;
            const p = getPos(e);
            this._draw(p.x, p.y);
        };
        const move = (e) => {
            if (!this._drawing) return;
            e.preventDefault();
            const p = getPos(e);
            this._draw(p.x, p.y);
        };
        const end = () => { this._drawing = false; };

        c.addEventListener('mousedown', start);
        c.addEventListener('mousemove', move);
        c.addEventListener('mouseup', end);
        c.addEventListener('mouseleave', end);
        c.addEventListener('touchstart', start, { passive: false });
        c.addEventListener('touchmove', move, { passive: false });
        c.addEventListener('touchend', end);
    },

    _draw(x, y) {
        const ctx = this._maskCtx;
        ctx.beginPath();
        ctx.arc(x, y, this._brushSize / 2, 0, Math.PI * 2);
        if (this._mode === 'brush') {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.55)';
            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0,0,0,1)';
        }
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        this._redrawOverlay();
    },

    _redrawOverlay() {
        if (!this._img) return;
        const w = this._canvas.width;
        const h = this._canvas.height;
        this._ctx.clearRect(0, 0, w, h);
        this._ctx.drawImage(this._img, 0, 0, w, h);
        this._ctx.drawImage(this._maskCanvas, 0, 0, w, h);
    },

    async loadImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this._img = img;
                this._origW = img.width;
                this._origH = img.height;
                // Limit display size for performance; processing will use full resolution
                const maxSide = 1200;
                let w = img.width, h = img.height;
                if (w > maxSide || h > maxSide) {
                    const r = Math.min(maxSide / w, maxSide / h);
                    w = Math.round(w * r);
                    h = Math.round(h * r);
                }
                this._scale = img.width / w; // >1 when scaled down for display
                this._canvas.width = w;
                this._canvas.height = h;
                this._maskCanvas.width = w;
                this._maskCanvas.height = h;
                this._maskCtx.clearRect(0, 0, w, h);
                this._ctx.drawImage(img, 0, 0, w, h);
                resolve({ width: img.width, height: img.height, displayW: w, displayH: h });
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    },

    setMode(mode) { this._mode = mode; },
    setBrushSize(size) { this._brushSize = size; },

    clearMask() {
        if (!this._maskCtx) return;
        this._maskCtx.clearRect(0, 0, this._maskCanvas.width, this._maskCanvas.height);
        this._redrawOverlay();
    },

    // processSimple: two modes controlled by this._outputMode
    //   'inpaint'  — fill masked area with neighbor-averaged background color (default)
    //   'erase'    — set masked area to fully transparent (alpha = 0), outputs PNG with alpha
    // Processing is always done at original (full) resolution for better quality.
    processSimple() {
        if (!this._img) return null;
        const dispW = this._maskCanvas.width;
        const dispH = this._maskCanvas.height;
        const fullW = this._origW || dispW;
        const fullH = this._origH || dispH;
        const scale = this._scale || 1;

        // Get display-resolution mask
        const maskData = this._maskCtx.getImageData(0, 0, dispW, dispH);

        // Work at full resolution
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = fullW;
        srcCanvas.height = fullH;
        const srcCtx = srcCanvas.getContext('2d', { alpha: true, willReadFrequently: true });
        srcCtx.clearRect(0, 0, fullW, fullH);
        srcCtx.drawImage(this._img, 0, 0, fullW, fullH);
        let imgData = srcCtx.getImageData(0, 0, fullW, fullH);
        const data = imgData.data;

        // Upscale binary mask to full resolution (nearest-neighbor for sharp brush edges)
        let isMasked = new Uint8Array(fullW * fullH);
        for (let y = 0; y < fullH; y++) {
            const sy = Math.min(dispH - 1, Math.floor(y / scale));
            for (let x = 0; x < fullW; x++) {
                const sx = Math.min(dispW - 1, Math.floor(x / scale));
                const mAlpha = maskData.data[(sy * dispW + sx) * 4 + 3];
                isMasked[y * fullW + x] = mAlpha > 10 ? 1 : 0;
            }
        }

        if (this._outputMode === 'erase') {
            // Dilate the mask (radius scales with image size) so soft / anti-aliased
            // watermark edges are fully covered and no gray/black fringe remains.
            const radius = Math.max(2, Math.round(2 * scale));
            const dilated = new Uint8Array(fullW * fullH);
            for (let y = 0; y < fullH; y++) {
                for (let x = 0; x < fullW; x++) {
                    const idx = y * fullW + x;
                    if (isMasked[idx]) {
                        dilated[idx] = 1;
                        continue;
                    }
                    let found = 0;
                    for (let dy = -radius; dy <= radius && !found; dy++) {
                        for (let dx = -radius; dx <= radius && !found; dx++) {
                            const nx = x + dx, ny = y + dy;
                            if (nx < 0 || ny < 0 || nx >= fullW || ny >= fullH) continue;
                            if (isMasked[ny * fullW + nx]) found = 1;
                        }
                    }
                    dilated[idx] = found;
                }
            }
            isMasked = dilated;

            // Set masked pixels to fully transparent + zero RGB
            for (let i = 0; i < fullW * fullH; i++) {
                if (!isMasked[i]) continue;
                const p = i * 4;
                data[p] = 0;
                data[p + 1] = 0;
                data[p + 2] = 0;
                data[p + 3] = 0;
            }
        } else {
            // Inpaint mode at full resolution
            for (let pass = 0; pass < 12; pass++) {
                const copy = new Uint8ClampedArray(data);
                for (let y = 1; y < fullH - 1; y++) {
                    for (let x = 1; x < fullW - 1; x++) {
                        const idx = y * fullW + x;
                        if (!isMasked[idx]) continue;
                        let r = 0, g = 0, b = 0, n = 0;
                        for (let dy = -2; dy <= 2; dy++) {
                            for (let dx = -2; dx <= 2; dx++) {
                                const nx = x + dx, ny = y + dy;
                                if (nx < 0 || ny < 0 || nx >= fullW || ny >= fullH) continue;
                                const nidx = ny * fullW + nx;
                                if (isMasked[nidx] && pass < 6) continue;
                                const p = nidx * 4;
                                r += copy[p]; g += copy[p + 1]; b += copy[p + 2];
                                n++;
                            }
                        }
                        if (n > 0) {
                            const p = idx * 4;
                            data[p]     = Math.round(r / n);
                            data[p + 1] = Math.round(g / n);
                            data[p + 2] = Math.round(b / n);
                            data[p + 3] = 255;
                        }
                    }
                }
            }
        }

        srcCtx.putImageData(imgData, 0, 0);

        // Update display canvas (scaled down) with the full-res result
        this._ctx.save();
        this._ctx.globalCompositeOperation = 'copy';
        this._ctx.drawImage(srcCanvas, 0, 0, dispW, dispH);
        this._ctx.restore();

        // Clear mask after process
        this._maskCtx.clearRect(0, 0, dispW, dispH);

        // Produce full-resolution PNG (alpha preserved)
        this._resultDataUrl = srcCanvas.toDataURL('image/png');

        // Update source image to the full-res result for further editing
        const resultImg = new Image();
        resultImg.src = this._resultDataUrl;
        this._img = resultImg;
        this._origW = fullW;
        this._origH = fullH;

        return this._resultDataUrl;
    },

    // Set output mode: 'inpaint' (default) or 'erase'
    setOutputMode(mode) { this._outputMode = mode || 'inpaint'; },

    /**
     * One-click background removal (color-key style).
     * Samples the four corners to detect the dominant background color,
     * then makes all similar pixels fully transparent.
     * Works best on logos / icons with solid or near-solid light/dark backgrounds.
     * tolerance: 0~100, higher = more aggressive (default 32)
     */
    removeBackground(tolerance = 32) {
        if (!this._img) return null;
        const fullW = this._origW || this._canvas.width;
        const fullH = this._origH || this._canvas.height;
        const dispW = this._canvas.width;
        const dispH = this._canvas.height;

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = fullW;
        srcCanvas.height = fullH;
        const srcCtx = srcCanvas.getContext('2d', { alpha: true, willReadFrequently: true });
        srcCtx.clearRect(0, 0, fullW, fullH);
        srcCtx.drawImage(this._img, 0, 0, fullW, fullH);
        const imgData = srcCtx.getImageData(0, 0, fullW, fullH);
        const data = imgData.data;

        // Sample four corners (average a small patch) to get bg color
        const sample = (cx, cy) => {
            let r = 0, g = 0, b = 0, n = 0;
            for (let dy = -3; dy <= 3; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                    const x = Math.max(0, Math.min(fullW - 1, cx + dx));
                    const y = Math.max(0, Math.min(fullH - 1, cy + dy));
                    const p = (y * fullW + x) * 4;
                    // skip already transparent
                    if (data[p + 3] < 10) continue;
                    r += data[p]; g += data[p + 1]; b += data[p + 2];
                    n++;
                }
            }
            return n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : [255, 255, 255];
        };

        const c1 = sample(5, 5);
        const c2 = sample(fullW - 6, 5);
        const c3 = sample(5, fullH - 6);
        const c4 = sample(fullW - 6, fullH - 6);
        // Use the most common-ish (average of corners is fine for solid bg)
        const bgR = Math.round((c1[0] + c2[0] + c3[0] + c4[0]) / 4);
        const bgG = Math.round((c1[1] + c2[1] + c3[1] + c4[1]) / 4);
        const bgB = Math.round((c1[2] + c2[2] + c3[2] + c4[2]) / 4);

        const tol = Math.max(8, Math.min(80, tolerance));
        // Soft falloff range: pixels within [tol, tol+feather] get partial alpha
        const feather = Math.max(12, Math.round(tol * 0.6));
        const hard2 = tol * tol * 3;
        const soft2 = (tol + feather) * (tol + feather) * 3;

        // First pass: soft color-key (distance-based alpha)
        for (let i = 0; i < fullW * fullH; i++) {
            const p = i * 4;
            if (data[p + 3] < 10) continue;
            const dr = data[p] - bgR;
            const dg = data[p + 1] - bgG;
            const db = data[p + 2] - bgB;
            const dist2 = dr * dr + dg * dg + db * db;
            if (dist2 <= hard2) {
                data[p] = 0; data[p + 1] = 0; data[p + 2] = 0; data[p + 3] = 0;
            } else if (dist2 < soft2) {
                // Linear falloff → softer edge, reduces jagged aliasing
                const t = (Math.sqrt(dist2) - tol) / feather;
                const a = Math.max(0, Math.min(255, Math.round(t * 255)));
                data[p + 3] = Math.min(data[p + 3], a);
            }
        }

        // Second pass: light alpha blur on edge pixels only (3x3 box) to further smooth jaggies
        const alphaCopy = new Uint8ClampedArray(fullW * fullH);
        for (let i = 0; i < fullW * fullH; i++) alphaCopy[i] = data[i * 4 + 3];
        for (let y = 1; y < fullH - 1; y++) {
            for (let x = 1; x < fullW - 1; x++) {
                const idx = y * fullW + x;
                const a = alphaCopy[idx];
                // Only process partial-alpha edge pixels
                if (a === 0 || a === 255) continue;
                let sum = 0, n = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        sum += alphaCopy[(y + dy) * fullW + (x + dx)];
                        n++;
                    }
                }
                data[idx * 4 + 3] = Math.round(sum / n);
            }
        }

        srcCtx.putImageData(imgData, 0, 0);

        // Update display
        this._ctx.save();
        this._ctx.globalCompositeOperation = 'copy';
        this._ctx.drawImage(srcCanvas, 0, 0, dispW, dispH);
        this._ctx.restore();
        this._maskCtx.clearRect(0, 0, dispW, dispH);

        this._resultDataUrl = srcCanvas.toDataURL('image/png');
        const resultImg = new Image();
        resultImg.src = this._resultDataUrl;
        this._img = resultImg;
        this._origW = fullW;
        this._origH = fullH;

        return this._resultDataUrl;
    },

    getResultDataUrl() {
        return this._resultDataUrl || (this._canvas ? this._canvas.toDataURL('image/png') : null);
    },

    reset() {
        this._img = null;
        if (this._ctx) this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        if (this._maskCtx) this._maskCtx.clearRect(0, 0, this._maskCanvas.width, this._maskCanvas.height);
    }
};
