'use strict';
let uuidv4 = require('uuid').v4;
let express = require('express');
let web = express();
let http = require('http').createServer(web);
let io = require('socket.io')(http);
let Twitter = require('twitter-lite');
let fs = require('fs');
let sass = require('sass');
let multer = require('multer');
let osc = require('osc');
let _ = require('lodash');
const electron = require('electron');
const zip = require('adm-zip');
const app = electron.app;
let config;
try {
  config = require(__dirname + '/config.json');
} catch(e) {
  config = require(__dirname + '/config.dist.json');
}

const BrowserWindow = electron.BrowserWindow;

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  mainWindow.loadURL('http://localhost:3000/control');
  mainWindow.on('closed', function() {
    mainWindow = null;
    http.close();
    app.quit();
  });
}

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
if(!fs.existsSync(__dirname + '/static/img/uploads')) {
  fs.mkdirSync(__dirname + '/static/img/uploads');
}

// delete unused uploads
(function() {
  let files = fs.readdirSync(__dirname + '/static/img/uploads');
  files.forEach(function(e) {
    let there = false;
    config.lowerThird.images.forEach(function(i) {
      if(e === i.url) {
        there = true
      }
    });
    if(!there)
      fs.unlinkSync(__dirname + '/static/img/uploads/' + e);
  });
})();

let uploader = multer({
  storage: multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, __dirname + '/static/img/uploads');
    },
    filename: function(req, file, cb) {
      cb(null, Date.now() + '.' + file.originalname.split('.').pop());
    }
  })
});

let receiver = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 8001
});

receiver.on('message', function(oscMsg) {
  switch(oscMsg.address) {
    case '/lowerthird/next':
      if(oscMsg.args.length >= 1 && args[0]) {
        showNext();
      }
      break;
    default:
      console.log(oscMsg);
  }
});

receiver.open();

web.post('/upload', uploader.single('file'), function(req, res) {
  if(!config.lowerThird.images)
    config.lowerThird.images = [];
  let image = {
    url: req.file.filename,
    styles: {
      width: 100,
      top: 0,
      left: 0,
      rotation: 0,
      'z-index': 100,
      'animation-in': 'none',
      'in-timing-function': 'ease',
      inDelay: 0,
      inDuration: 0,
      'animation-out': 'none',
      'out-timing-function': 'ease',
      outDelay: 0,
      outDuration: 0,
      opacity: 1
    }
  };
  config.lowerThird.images.push(image);
  res.json(image);
});
web.use('/control', express.static(__dirname + '/static/control.html'));
web.use('/', express.static(__dirname + '/static/'));
web.use('/', function(req, res) {
  res.redirect('/present.html');
});
http.listen(3000, function(){

  app.on('ready', createWindow);

  console.log('listening on *:3000');
});

let createStyle = function(obj, style) {
  let s = "";
  for(let name in obj[style]) {
    let unit = "";
    switch(name) {
      case "top":
      case "left":
      case "height":
      case "width":
        unit = "%";
        break;
      case "font-size":
        unit = "px";
        break;
      case "inDuration":
      case "inDelay":
      case "outDuration":
      case "outDelay":
        unit = 'ms';
        break;
      default:
        break;
    }
    s += "$" + style + "-" + name + ": " + obj[style][name] + unit + "; \n";
  }
  return s;
};
let createImageStyles = function(images) {
  let data = {};
  images.forEach(function(i) {
    let s = i.styles;
    for(let name in s) {
      if(!data[name])
        data[name] = '';
      let unit = "";
      switch(name) {
        case "top":
        case "left":
        case "height":
        case "width":
          unit = "%";
          break;
        case "font-size":
          unit = "px";
          break;
        case "inDuration":
        case "inDelay":
        case "outDuration":
        case "outDelay":
          unit = 'ms';
          break;
        case "rotation":
          unit = 'deg';
        default:
          break;
      }
      data[name] += " " + s[name] + unit;
    }
  });
  let buf = "";

  for(let name in data) {
    buf += '$images-' + name + ':' + data[name] + "; \n";
  }
  return buf;
};
function showNext(socket) {
  let item = config.list.shift();
  io.emit('show', item);
  if(socket)
    socket.emit('list', config.list);
  else
    io.emit('list', config.list);
}
io.on('connection', function(socket){
  function createStyles(c) {
    c = c || config;
    if(!c) {
      return;
    }
    let style_variables = "";
    style_variables += createStyle(c.lowerThird, 'styles');
    style_variables += createStyle(c.lowerThird, 'titleStyles');
    style_variables += createStyle(c.lowerThird, 'subtitleStyles');
    style_variables += '$imagesCount: ' + c.lowerThird.images.length + '; \n';
    style_variables += createImageStyles(c.lowerThird.images);
    let stylesheet = fs.readFileSync(__dirname + '/style.scss', {encoding: "utf8"});
    fs.writeFile('styles.scss', style_variables + stylesheet, () => {});
    let styles = "";
    try {
      styles = sass.renderSync({
        data: style_variables + stylesheet
      });
      io.emit('styles', styles.css.toString());
    } catch (e) {
      console.log(e);
    }
  }

  socket.on('getConfig', function() {
    socket.emit('config', config);
  });
  socket.on('show', function(msg){
    msg.id = uuidv4();
    io.emit('show', msg);
  });
  socket.on('hide', function(msg){
    io.emit('hide', msg);
  });
  socket.on('showTweets', function(msg){
    if(!msg.length)
      return;
    io.emit('showTweets', selectedTweets);
    selectedTweets = [];
    io.emit('updateSelectedTweets', selectedTweets);
  });
  socket.on('config', function(msg) {
    config = _.defaultsDeep(msg, config);
    config.lowerThird.images = msg.lowerThird.images;
    fs.writeFile(__dirname + '/config.json', JSON.stringify(config), () => {});
    createTwitStream();
    createStyles();
  });
  socket.on('updateStyles', function(msg) {
    createStyles(msg);
  });
  socket.on('restart', function() {
    process.exit();
  });
  socket.on('getStyles', function() {
    createStyles();
  });
  socket.on('selectTweet', function(msg) {
    selectedTweets.push(msg);
    io.emit('updateSelectedTweets', selectedTweets);
  });
  socket.on('deselectTweet', function(tweet) {
    for(let i = 0; i< selectedTweets.length; i++) {
      if(selectedTweets[i].id == tweet.id) {
        selectedTweets.splice(i, 1);
      }
    }
    io.emit('updateSelectedTweets', selectedTweets);
  });
  socket.on('updateTweets', function() {
    socket.emit('updateSelectedTweets', selectedTweets);
    socket.emit('tweet', tweets);
  });
  socket.on('addList', function(msg) {
    if(!config.list)
      config.list = [];
    msg.id = uuidv4();
    config.list.push(msg);
    socket.emit('list', config.list);
  });
  socket.on('getList', function() {
    socket.emit('list', config.list);
  });
  socket.on('removeList', function(msg) {
    for(let i=0; i<config.list.length; i++) {
      if(config.list[i].id === msg.id)
        config.list.splice(i, 1);
    }
    socket.emit('list', config.list);
  });
  socket.on('playNext', function() {
    showNext(socket);
  });
  socket.on('playItem', function(msg) {
    for(let i=0; i<config.list.length; i++) {
      if(config.list[i].id === msg.id)
        config.list.splice(i, 1);
    }
    io.emit('show', msg);
    socket.emit('list', config.list);
  });
  socket.on('upItem', function(msg) {
    for(let i=0; i<config.list.length; i++) {
      if(config.list[i].id == msg.id) {
        if(i==0)
          break;
        let buf = _.clone(config.list[i]);
        config.list[i] = _.clone(config.list[i-1]);
        config.list[i-1] = buf;
        break;
      }
    }
    socket.emit('list', config.list);
  });
  socket.on('downItem', function(msg) {

    for(let i=0; i<config.list.length; i++) {
      if(config.list[i].id == msg.id) {
        if(i+1===config.list.length)
          break;
        let buf = _.clone(config.list[i]);
        config.list[i] = _.clone(config.list[i+1]);
        config.list[i+1] = buf;
        break;
      }
    }
    socket.emit('list', config.list);
  });
  socket.on('export', function(msg) {
    try {
      if(!msg.path.endsWith('.zip')) {
        msg.path = msg.path + '.zip';
      }
      console.log("exporting to " + msg.path);
      let zipFile = new zip();
      zipFile.addLocalFile('config.json');
      zipFile.addLocalFolder('static/img/uploads', 'uploads');
      zipFile.writeZip(msg.path, function (err) {
        if(err)
          throw Error(err);
        socket.emit('message', {msg: 'Export finished', title: 'Export', type: 'info'})
      });
    } catch(e) {
      console.log(e);
    }
  });
  socket.on('import', function(msg) {
    let zipFile = new zip(msg.path);
    zipFile.extractEntryTo('config.json', __dirname + '/', false, true);
    zipFile.getEntries()
        .forEach((e) => {
          if(e.entryName === 'config.json') return;
          zipFile.extractEntryTo(e.entryName, __dirname + '/static/img/', true, true);
        });
  })
});

let twit = new Twitter(config.twitter);
let tweets = [];
let stream;
let selectedTweets = [];
function createTwitStream() {
  console.log(!!stream);
  console.log("creating twitter stream", config.twitter.hashtag);
  if(stream)
    stream.destroy();
  if(!config.twitter.hashtag)
    return;
  stream = twit.stream('statuses/filter', {track: config.twitter.hashtag})
    .on('data', function(msg) {
      if(msg.retweeted || msg.in_reply_to_screen_name != null || msg.text.substr(0,2) == "RT") { return; }
      tweets.push({
        screen_name: msg.user.screen_name,
        text: msg.text,
        id: msg.id
      });
      if(tweets.length > 10)
        tweets.shift();
      io.emit('tweet', tweets);
    })
    .on("error", error => {
      console.log(error);
    })
}
createTwitStream();
