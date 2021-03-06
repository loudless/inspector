const PSD = require('psd');
const fs = require('fs');
const express = require('express');
const app = express();
const PORT = 4300;
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer({
  dest: 'uploads/'
});
const Jimp = require('jimp');
const moment = require('moment');

app.use(express.static(__dirname + '/dist'));
app.use('/layers', express.static(__dirname + '/layers'));
app.use(bodyParser());

app.get('/inspector', (req, res) => res.sendFile(__dirname + '/dist/index.html'));

app.post('/api/upload', upload.single('psd'), (req, res) => {
  deleteOld();

  const fileName = req.file.filename;
  const psd = PSD.fromFile(req.file.path);
  psd.parse();

  const tree = psd.tree().export();

  const imagePath = `./layers/${fileName}.png`;

  psd.image.saveAsPng(imagePath).then(() => {
    res.send({
      tree,
      imagePath: './inspector' + imagePath.slice(1),
      fileName
    }).status(201);
  });
});

app.post('/api/layer-image', async (req, res) => {
  const filePath = `./uploads/${req.body.fileName}`;
  const psd = PSD.fromFile(filePath);
  psd.parse();

  const paths = req.body.layerPaths;
  let results = [];

  for (let i = 0; i < paths.length; i++) {
    try {
      const path = paths[i];

      const child = psd.tree().childrenAtPath(path)[0];
      const layerPath = path.join('_').replace(/[^a-zA-Z0-9]/g, '');
      const layerImagePath = `./layers/layer_${layerPath}.png`;

      let success;

      if (child.layer) {
        success = await saveLayerImage(child, layerImagePath);

      } else {
        success = false;
      }

      if (success) {
        results.push({
          src: '/inspector/' + layerImagePath.substring(2),
          x: child.left,
          y: child.top,
          width: child.width,
          height: child.height
        });

        if (paths.length === 1) {
          results[0].color = await getAverageColor(layerImagePath);
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  if (results.length) {
    results = align(results);
  }

  res.send({
    layerImagePaths: results
  }).status(200);
});

const deleteOld = () => {
  const folders = [ './layers', './uploads' ];
  folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
      return;
    }

    const files = fs.readdirSync(folder);

    files.forEach(file => {
      const filePath = folder + '/' + file;

      const stat = fs.statSync(filePath);
      const fromNow = moment(stat.mtime).fromNow(true);
      const [ amount, period ] = fromNow.split(' ');

      if (period === 'days' && parseInt(amount) >= 1) {
        fs.unlinkSync(filePath);
      }
    });
  });
};

const getAverageColor = (path) => new Promise((resolve, reject) => {
  let cnt = 0;
  let RED = 0;
  let GREEN = 0;
  let BLUE = 0;

  Jimp.read(path, (err, image) => {
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {

      const alpha = image.bitmap.data[idx + 3];

      if (alpha !== 0) {
        const red = image.bitmap.data[idx + 0];
        const green = image.bitmap.data[idx + 1];
        const blue = image.bitmap.data[idx + 2];

        RED += red;
        GREEN += green;
        BLUE += blue;

        cnt++;
      }

      if (x === image.bitmap.width - 1 && y === image.bitmap.height - 1) {
        const average = [parseInt(RED / cnt), parseInt(GREEN / cnt), parseInt(BLUE / cnt)];
        resolve(average);
      }
    });
  });
});

const align = (results) => {
  results = results.filter(result => result && ('x' in result) && ('y' in result));

  let minLeft = results[0].x,
    minTop = results[0].y;

  results.forEach(layer => {
    if (layer.x < minLeft) {
      minLeft = layer.x;
    }

    if (layer.y < minTop) {
      minTop = layer.y;
    }
  });

  results = results.map(layer => ({
    ...layer,
    offsetX: layer.x - minLeft,
    offsetY: layer.y - minTop
  }));

  return results;
};

const saveLayerImage = (child, layerImagePath) =>
  new Promise((resolve, reject) => {
    if (fs.existsSync(layerImagePath)) {
      resolve(true);

    } else {
      try {
        child.layer.image.saveAsPng(layerImagePath).then(() => {
          resolve(true);
        }).catch(err => {
          resolve(false);
        });
      } catch (err) {
        console.log(err);
      }
    }
  });

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));
