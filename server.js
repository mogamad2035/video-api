const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();

const upload = multer({ dest: "/tmp/uploads" });

app.get("/", (req, res) => {
  res.send("Video API is running");
});

app.post(
  "/generate",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 }
  ]),
  (req, res) => {
    try {
      if (!req.files || !req.files.image || !req.files.audio) {
        return res.status(400).send("image and audio are required");
      }

      const imagePath = req.files.image[0].path;
      const audioPath = req.files.audio[0].path;
      const outputPath = path.join("/tmp", `output-${Date.now()}.mp4`);

      const cmd = `ffmpeg -loop 1 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest -movflags +faststart -y "${outputPath}"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(stderr);
          return res.status(500).send("ffmpeg failed");
        }

        res.download(outputPath, "video.mp4", () => {
          [imagePath, audioPath, outputPath].forEach((file) => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
          });
        });
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("server error");
    }
  }
);

app.post("/merge", upload.array("clips", 20), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("clips are required");
    }

    const listFilePath = path.join("/tmp", `list-${Date.now()}.txt`);
    const outputPath = path.join("/tmp", `final-${Date.now()}.mp4`);

    const listContent = req.files
      .map((file) => `file '${file.path}'`)
      .join("\n");

    fs.writeFileSync(listFilePath, listContent);

    const cmd = `ffmpeg -f concat -safe 0 -i "${listFilePath}" -c copy -y "${outputPath}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr);
        return res.status(500).send("merge failed");
      }

      res.download(outputPath, "final.mp4", () => {
        [...req.files.map((f) => f.path), listFilePath, outputPath].forEach((file) => {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        });
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("server error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
