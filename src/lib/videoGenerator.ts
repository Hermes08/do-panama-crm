
interface PropertyData {
    title: string;
    price: string;
    location: string;
    bedrooms?: string;
    bathrooms?: string;
    area?: string;
    description: string;
    features: string[];
    images: string[];
    source: string;
}

// Configuration
const FPS = 30;
const FRAME_INTERVAL = 1000 / FPS; // ~33ms per frame
const WIDTH = 1280;
const HEIGHT = 720;
const TITLE_DURATION = 4000;
const STATS_DURATION = 4000;
const IMAGE_DURATION = 5000; // ms per image slide (5s is standard)

// Helper to get proxied URL for external images
function getProxiedUrl(url: string): string {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
    try {
        const parsed = new URL(url);
        if (parsed.origin !== window.location.origin) {
            return `/.netlify/functions/proxy-image?url=${encodeURIComponent(url)}`;
        }
    } catch { /* not a valid URL */ }
    return url;
}

// Helper to load image
const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const proxiedUrl = getProxiedUrl(url);
        if (proxiedUrl !== url || url.startsWith('data:')) {
            img.crossOrigin = "Anonymous";
        }
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${url}`));
        img.src = proxiedUrl;
    });
};

/**
 * Generates a video Blob from property data using Canvas + MediaRecorder.
 * Uses setTimeout-based rendering to avoid requestAnimationFrame throttling
 * when the browser tab is not focused (which would cause skipped frames).
 */
export async function generatePropertyVideo(
    data: PropertyData,
    customImages: string[],
    onProgress?: (progress: number) => void
): Promise<Blob> {
    // 1. Setup Canvas
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // 2. Prepare Assets
    const allImages = [...customImages, ...data.images];
    const imagesToUse = [...new Set(allImages)]; // Use all images, deduplicated

    // Load images
    const loadedImages: HTMLImageElement[] = [];
    for (const url of imagesToUse) {
        try {
            const img = await loadImage(url);
            loadedImages.push(img);
        } catch (e) {
            console.warn("Skipping image", e);
        }
    }

    if (loadedImages.length === 0) {
        throw new Error("No images available for video.");
    }

    console.log(`[VideoGen] Generating video with ${loadedImages.length} images, ${IMAGE_DURATION / 1000}s each`);

    // 3. Setup Audio & Recorder
    let audioEl: HTMLAudioElement | null = null;
    let audioCtx: AudioContext | null = null;
    let sourceNode: MediaElementAudioSourceNode | null = null;
    let destNode: MediaStreamAudioDestinationNode | null = null;
    
    // Use local file, cache busted
    const musicUrl = "/audio/background.mp3"; 

    try {
        console.log(`[VideoGen] Initializing audio from ${musicUrl}`);
        audioEl = new Audio(musicUrl);
        audioEl.crossOrigin = "anonymous";
        audioEl.loop = true;
        
        // Use Web Audio API to capture stream WITHOUT playing to speakers
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
            
            // Resume context immediately (requires user gesture, provided by button click)
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            sourceNode = audioCtx.createMediaElementSource(audioEl);
            destNode = audioCtx.createMediaStreamDestination();
            
            // Connect ONLY to destination, NOT to audioCtx.destination (speakers)
            sourceNode.connect(destNode);
            
            // Attempt to play
            await audioEl.play();
            console.log("[VideoGen] Audio playing and routed to stream");
        }
    } catch (e) {
        console.warn("[VideoGen] Audio setup failed, proceeding with silent video", e);
        // Ensure we don't use broken audio components
        if (audioEl) { audioEl.pause(); audioEl = null; }
        if (audioCtx) { audioCtx.close(); audioCtx = null; }
        destNode = null;
    }

    const stream = canvas.captureStream(FPS);
    
    // Add audio track ONLY if fully initialized
    if (destNode && destNode.stream) {
        const audioTracks = destNode.stream.getAudioTracks();
        if (audioTracks.length > 0) {
            console.log("[VideoGen] WebAudio track added to stream");
            stream.addTrack(audioTracks[0]);
        }
    }

    const mimeType = MediaRecorder.isTypeSupported("video/webm; codecs=vp9")
        ? "video/webm; codecs=vp9"
        : "video/webm";

    console.log(`[VideoGen] Starting recorder with mimeType: ${mimeType}`);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
    const chunks: Blob[] = [];
    
    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onerror = (e) => {
        console.error("[VideoGen] Recorder Error:", e);
    };

    let resolveCompletion: (blob: Blob) => void;

    const completionPromise = new Promise<Blob>((resolve) => {
        resolveCompletion = resolve;
    });

    recorder.onstop = () => {
        if (audioEl) {
            audioEl.pause(); 
            audioEl = null;
        }
        if (audioCtx) {
            if (audioCtx.state !== 'closed') audioCtx.close();
            audioCtx = null;
        }

        const blob = new Blob(chunks, { type: mimeType });
        console.log(`[VideoGen] Recording finished. Blob size: ${blob.size} bytes`);
        resolveCompletion(blob);
    };

    try {
        recorder.start();
    } catch (err) {
        console.error("[VideoGen] Failed to start recorder", err);
        throw err;
    }

    // 4. Frame-by-frame rendering using virtual time
    // We use a virtual clock instead of real wall-clock time so that
    // every frame is guaranteed to be rendered, even if setTimeout drifts
    // or the tab is throttled.
    const totalDuration = TITLE_DURATION + STATS_DURATION + (loadedImages.length * IMAGE_DURATION);
    const totalFrames = Math.ceil(totalDuration / FRAME_INTERVAL);
    let currentFrame = 0;

    console.log(`[VideoGen] Total duration: ${(totalDuration / 1000).toFixed(1)}s, Total frames: ${totalFrames}`);

    const renderFrame = () => {
        if (currentFrame >= totalFrames) {
            // All frames rendered — stop recording
            if (recorder.state === "recording") {
                recorder.stop();
            }
            return;
        }

        // Virtual elapsed time based on frame count (not wall clock)
        const elapsed = currentFrame * FRAME_INTERVAL;

        // Clear
        ctx.fillStyle = "#0f172a"; // Slate 900
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        if (elapsed < TITLE_DURATION) {
            // === SCENE 1: TITLE ===
            const progress = elapsed / TITLE_DURATION;
            // Fade in/out
            const fade = progress < 0.2 ? progress * 5 : (progress > 0.8 ? (1 - progress) * 5 : 1);

            ctx.globalAlpha = Math.min(1, Math.max(0, fade));

            // Background branding
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            // Text
            ctx.textAlign = "center";
            ctx.fillStyle = "#38bdf8"; // Sky 400
            ctx.font = "bold 60px sans-serif";
            ctx.fillText("FOR SALE", WIDTH / 2, HEIGHT / 2 - 80);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 40px sans-serif";
            ctx.fillText(data.title.substring(0, 40), WIDTH / 2, HEIGHT / 2);
            if (data.title.length > 40) {
                ctx.fillText(data.title.substring(40, 80) + "...", WIDTH / 2, HEIGHT / 2 + 50);
            }

            ctx.fillStyle = "#fbbf24"; // Amber
            ctx.font = "bold 50px sans-serif";
            ctx.fillText(data.price, WIDTH / 2, HEIGHT / 2 + 130);

            // Reset Alpha
            ctx.globalAlpha = 1;

        } else if (elapsed < TITLE_DURATION + STATS_DURATION) {
            // === SCENE 2: STATS ===
            const localElapsed = elapsed - TITLE_DURATION;
            const progress = localElapsed / STATS_DURATION;
            const fade = progress < 0.2 ? progress * 5 : (progress > 0.8 ? (1 - progress) * 5 : 1);
            ctx.globalAlpha = Math.min(1, Math.max(0, fade));

            ctx.fillStyle = "#f1f5f9"; // Light bg
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            ctx.fillStyle = "#0f172a";
            ctx.textAlign = "center";
            ctx.font = "bold 50px sans-serif";
            ctx.fillText("PROPERTY DETAILS", WIDTH / 2, 100);

            // Grid of stats
            const stats = [
                { l: "Bedrooms", v: data.bedrooms },
                { l: "Bathrooms", v: data.bathrooms },
                { l: "Area", v: data.area },
                { l: "Location", v: data.location.split(",")[0] }
            ].filter(d => d.v);

            if (stats.length > 0) {
                const gap = 250;
                const startX = WIDTH / 2 - ((stats.length - 1) * gap) / 2;

                stats.forEach((stat, i) => {
                    const x = startX + i * gap;
                    const y = HEIGHT / 2; // Center Y

                    // Icon Circle
                    ctx.beginPath();
                    ctx.fillStyle = "#38bdf8";
                    ctx.arc(x, y - 60, 50, 0, Math.PI * 2);
                    ctx.fill();

                    // Text
                    ctx.fillStyle = "#0f172a";
                    ctx.font = "bold 36px sans-serif";
                    ctx.fillText(stat.v || "-", x, y + 30);

                    ctx.fillStyle = "#64748b";
                    ctx.font = "24px sans-serif";
                    ctx.fillText(stat.l, x, y + 70);
                });
            }

            ctx.globalAlpha = 1;

        } else {
            // === SCENE 3: IMAGES ===
            const imageElapsed = elapsed - (TITLE_DURATION + STATS_DURATION);
            const imageIndex = Math.floor(imageElapsed / IMAGE_DURATION);

            if (imageIndex < loadedImages.length) {
                const img = loadedImages[imageIndex];
                const slideProgress = (imageElapsed % IMAGE_DURATION) / IMAGE_DURATION; // 0 to 1

                // Ken Burns Effect: Zoom 1.0 -> 1.1, Pan X
                const scale = 1.0 + (slideProgress * 0.1);

                // Determine render dimensions to cover
                const imgRatio = img.width / img.height;
                const canvasRatio = WIDTH / HEIGHT;

                let renderW, renderH, offsetX = 0, offsetY = 0;
                if (imgRatio > canvasRatio) {
                    // Image is wider than canvas
                    renderH = HEIGHT;
                    renderW = HEIGHT * imgRatio;
                    offsetX = (WIDTH - renderW) / 2; // Center horizontal
                } else {
                    // Image is taller/square
                    renderW = WIDTH;
                    renderH = WIDTH / imgRatio;
                    offsetY = (HEIGHT - renderH) / 2; // Center vertical
                }

                // Draw
                ctx.save();

                // Fade effect
                let alpha = 1;
                if (slideProgress < 0.1) alpha = slideProgress * 10;
                if (slideProgress > 0.9) alpha = (1 - slideProgress) * 10;
                ctx.globalAlpha = alpha;

                // Transform from center
                ctx.translate(WIDTH / 2, HEIGHT / 2);
                ctx.scale(scale, scale);
                ctx.translate(-WIDTH / 2, -HEIGHT / 2); // Move back

                // Draw centered
                ctx.drawImage(img, offsetX, offsetY, renderW, renderH);

                ctx.restore();

                // Text Overlay for Feature (if any)
                // Use default index for features
                const featureText = data.features[imageIndex % data.features.length];
                if (featureText) {
                    ctx.fillStyle = "rgba(0,0,0,0.6)";
                    ctx.fillRect(0, HEIGHT - 120, WIDTH, 120);

                    ctx.fillStyle = "#fff";
                    ctx.font = "30px sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillText(featureText, WIDTH / 2, HEIGHT - 50);
                }
            }
        }

        // Progress callback
        if (onProgress) {
            onProgress(Math.min(1, (currentFrame + 1) / totalFrames));
        }

        currentFrame++;

        // Schedule next frame using setTimeout (not requestAnimationFrame)
        // This ensures consistent rendering even when the tab is in background
        if (currentFrame < totalFrames && recorder.state === "recording") {
            // Render in real-time (~33ms) so MediaRecorder captures correct duration
            setTimeout(renderFrame, FRAME_INTERVAL);
        } else if (recorder.state === "recording") {
            recorder.stop();
        }
    };

    // Start rendering
    renderFrame();

    return completionPromise;
}
