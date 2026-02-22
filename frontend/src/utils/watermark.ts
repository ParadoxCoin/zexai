export const addWatermark = async (imageUrl: string, watermarkText: string = "ZexAi"): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Couldn't get canvas context"));
                return;
            }

            // 1. Draw original image
            ctx.drawImage(img, 0, 0);

            // 2. Configure watermark (semi-transparent elegant text)
            const fontSize = Math.max(24, Math.floor(img.width * 0.035)); // dynamic font size
            ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)"; // High quality semi-transparent white
            ctx.textAlign = "right";
            ctx.textBaseline = "bottom";

            // Add subtle but sharp shadow for depth
            ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
            ctx.shadowBlur = 6;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            // Calculate padding
            const paddingX = Math.floor(img.width * 0.03);
            const paddingY = Math.floor(img.height * 0.03);

            const textX = canvas.width - paddingX;
            const textY = canvas.height - paddingY;

            // 3. Draw Watermark text
            ctx.fillText(watermarkText, textX, textY);

            // Reset shadow before saving, just in case
            ctx.shadowColor = "transparent";

            // 4. Return Blob
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Canvas object conversion failed"));
            }, "image/png", 1.0);
        };

        img.onerror = () => {
            reject(new Error("Failed to load image for watermarking."));
        };

        // Add timestamp to bypass cache if needed, but not necessary here 
        img.src = imageUrl;
    });
};
