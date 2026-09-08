/**
 * Turns a live <video> frame into an upload-ready data URL.
 *
 * The preview is mirrored (people expect to see themselves as in a mirror) but
 * the captured frame deliberately is not: the model reads the photo literally,
 * and a mirrored capture renders lettering on clothing backwards and puts
 * partings and asymmetric features on the wrong side.
 */

export interface CaptureOptions {
  width?: number;
  height?: number;
  quality?: number;
}

export function captureFrame(
  video: HTMLVideoElement,
  { width = 1080, height = 1920, quality = 0.92 }: CaptureOptions = {},
): string {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) {
    throw new Error("The camera is not ready yet.");
  }

  // Centre-crop the source to the target aspect ratio, matching what the
  // object-cover preview showed the guest. Cropping to what they saw is the
  // difference between "that's my photo" and "why is my shoulder missing".
  const targetRatio = width / height;
  const sourceRatio = sourceWidth / sourceHeight;

  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
  } else {
    cropHeight = sourceWidth / targetRatio;
  }
  const cropX = (sourceWidth - cropWidth) / 2;
  const cropY = (sourceHeight - cropHeight) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the photo canvas.");

  context.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}
