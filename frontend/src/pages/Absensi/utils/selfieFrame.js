// Match the centered object-fit: cover crop shown by the live camera.
// Keep the crop in source pixels; downscale only after selecting the visible area.
export function selfieFrame(sourceWidth, sourceHeight, frameWidth, frameHeight, maxSize = 1280) {
  if (![sourceWidth, sourceHeight, frameWidth, frameHeight, maxSize].every((value) => Number.isFinite(value) && value > 0)) return null;
  const ratio = frameWidth / frameHeight;
  const cropWidth = Math.min(sourceWidth, sourceHeight * ratio);
  const cropHeight = cropWidth / ratio;
  const scale = Math.min(1, maxSize / Math.max(cropWidth, cropHeight));
  return {
    x: (sourceWidth - cropWidth) / 2,
    y: (sourceHeight - cropHeight) / 2,
    cropWidth,
    cropHeight,
    width: Math.max(1, Math.round(cropWidth * scale)),
    height: Math.max(1, Math.round(cropHeight * scale)),
  };
}
