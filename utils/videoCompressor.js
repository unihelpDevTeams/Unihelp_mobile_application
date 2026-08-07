import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

const ffmpeg = createFFmpeg({
  log: false,
});

let loaded = false;

export const compressVideo = async (file) => {
  if (!loaded) {
    await ffmpeg.load();
    loaded = true;
  }

  const inputName = "input.mp4";
  const outputName = "output.mp4";

  ffmpeg.FS("writeFile", inputName, await fetchFile(file));

  // compression settings (balanced quality + size reduction)
  await ffmpeg.run(
    "-i",
    inputName,
    "-vcodec",
    "libx264",
    "-crf",
    "28",
    "-preset",
    "veryfast",
    outputName
  );

  const data = ffmpeg.FS("readFile", outputName);

  const compressedFile = new File(
    [data.buffer],
    file.name.replace(/\..+$/, ".mp4"),
    { type: "video/mp4" }
  );

  return compressedFile;
};