/**
 * Turns a live <video> frame into an upload-ready data URL.
 *
 * The preview is mirrored (people expect to see themselves as in a mirror) but
 * the captured frame deliberately is not: the model reads the photo literally,
 * and a mirrored capture renders lettering on clothing backwards and puts
 * partings and asymmetric features on the wrong side.
 *
 * The whole frame is kept. This used to centre-crop to 9:16, which threw away
 * well over half the width of a phone's 4:3 sensor — the single biggest reason
 * the booth felt zoomed in. It is also the wrong trade now that the output is
 * a full-body portrait the model has to extend into: the more of the guest it
 * can see, the less it has to invent. The preview is fitted to the same frame,
 * so this is still exactly what the guest was shown.
 */

export interface CaptureOptions {
  /** Longest edge of the captured image. */
  maxEdge?: number;
  quality?: number;
}

export function captureFrame(
  video: HTMLVideoElement,
  { maxEdge = 1600, quality = 0.92 }: CaptureOptions = {},
): string {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) {
    throw new Error("The camera is not ready yet.");
  }

  // Downscaled, never upscaled: a device that hands back a small frame gets
  // its own resolution rather than a blurry enlargement of it.
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the photo canvas.");

  context.drawImage(video, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}
