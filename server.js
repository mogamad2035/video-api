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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});