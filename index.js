'use strict';

var express = require('express');
var web = express();
var http = require('http').Server(web);
var io = require('socket.io')(http);
var twitter = require('twitter');
var fs = require('fs');
var async = require('async');
var extend = require('node.extend');
var sass = require('node-sass');
var multer = require('multer');
var uuid = require('node-uuid');
var osc = require('osc-receiver');
var _ = require('lodash');
const electron = require('electron');
const Zip = require('zip-zip-top');
const app = electron.app;
var config;
try {
  config = require('./config.json');
} catch(e) {
  config = require('./config.dist.json');
}

const BrowserWindow = electron.BrowserWindow;

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({width: 1000, height: 600});

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
  var files = fs.readdirSync(__dirname + '/static/img/uploads');
  files.forEach(function(e) {
    var there = false;
    config.lowerThird.images.forEach(function(i) {
      if(e === i.url) {
        there = true
      }
    });
    if(!there)
      fs.unlinkSync(__dirname + '/static/img/uploads/' + e);
  });
})();

var uploader = multer({
  storage: multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, __dirname + '/static/img/uploads');
    },
    filename: function(req, file, cb) {
      cb(null, Date.now() + '.' + file.originalname.split('.').pop());
    }
  })
});

var receiver = new osc();
try {
  receiver.bind(8001);
} catch(e) {
  console.log(e);
}

receiver.on('message', function() {

  // handle all messages
  var address = arguments[0];
  var args = Array.prototype.slice.call(arguments, 1);
  console.log(address, args);
});

receiver.on('/lowerthird/next', function(a) {
  if(a)
    showNext();
});

web.post('/upload', uploader.single('file'), function(req, res) {
  if(!config.lowerThird.images)
    config.lowerThird.images = [];
  var image = {
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

var createStyle = function(obj, style) {
  var s = "";
  for(var name in obj[style]) {
    var unit = "";
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
var createImageStyles = function(images) {
  var data = {};
  images.forEach(function(i) {
    var s = i.styles;
    for(var name in s) {
      if(!data[name])
        data[name] = '';
      var unit = "";
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
  var buf = "";

  for(var name in data) {
    buf += '$images-' + name + ':' + data[name] + "; \n";
  }
  return buf;
};
function showNext(socket) {
  var item = config.list.shift();
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
    var style_variables = "";
    style_variables += createStyle(c.lowerThird, 'styles');
    style_variables += createStyle(c.lowerThird, 'titleStyles');
    style_variables += createStyle(c.lowerThird, 'subtitleStyles');
    style_variables += '$imagesCount: ' + c.lowerThird.images.length + '; \n';
    style_variables += createImageStyles(c.lowerThird.images);
    var stylesheet = fs.readFileSync('./style.scss', {encoding: "utf8"});
    fs.writeFile('styles.scss', style_variables + stylesheet, 'utf8');
    var styles = "";
    try {
      styles = sass.renderSync({
        data: style_variables + stylesheet
      });
      io.emit('styles', styles.css.toString());
    } catch (e) {
      console.log(e);
    }
  }

  socket.on('getConfig', function(msg) {
    socket.emit('config', config);
  });
  socket.on('show', function(msg){
    msg.id = uuid.v4();
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
    config = extend(true, config, msg);
    config.lowerThird.images = msg.lowerThird.images;
    fs.writeFile('./config.json', JSON.stringify(config), "utf8");
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
    for(var i = 0; i< selectedTweets.length; i++) {
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
    msg.id = uuid.v4();
    config.list.push(msg);
    socket.emit('list', config.list);
  });
  socket.on('getList', function() {
    socket.emit('list', config.list);
  });
  socket.on('removeList', function(msg) {
    for(var i=0; i<config.list.length; i++) {
      if(config.list[i].id === msg.id)
        config.list.splice(i, 1);
    }
    socket.emit('list', config.list);
  });
  socket.on('playNext', function() {
    showNext(socket);
  });
  socket.on('playItem', function(msg) {
    for(var i=0; i<config.list.length; i++) {
      if(config.list[i].id === msg.id)
        config.list.splice(i, 1);
    }
    io.emit('show', msg);
    socket.emit('list', config.list);
  });
  socket.on('upItem', function(msg) {
    for(var i=0; i<config.list.length; i++) {
      if(config.list[i].id == msg.id) {
        if(i==0)
          break;
        var buf = _.clone(config.list[i]);
        config.list[i] = _.clone(config.list[i-1]);
        config.list[i-1] = buf;
        break;
      }
    }
    socket.emit('list', config.list);
  });
  socket.on('downItem', function(msg) {

    for(var i=0; i<config.list.length; i++) {
      if(config.list[i].id == msg.id) {
        if(i+1===config.list.length)
          break;
        var buf = _.clone(config.list[i]);
        config.list[i] = _.clone(config.list[i+1]);
        config.list[i+1] = buf;
        break;
      }
    }
    socket.emit('list', config.list);
  });
  socket.on('export', function(msg) {
    try {
      console.log("exporting to " + msg.path);
      var zip = new Zip();
      var calls = [];
      calls.push(function(cb) {
        zip.addFile('config.json', function(err) {
          cb(err, null);
        });
      });
      config.lowerThird.images.forEach(function(i) {
        calls.push(function(cb) {
          zip.addFile('static/img/uploads/' + i.url, function(err) {
            cb(err, null);
          }, {
            rootFolder: 'uploads'
          });
        });
      });
      async.parallel(calls, function(err, results) {
        if(err)
          throw Error(err);
        zip.writeToFile(msg.path, function(err) {
          if(err)
            throw Error(err);
          socket.emit('message', {msg: 'Export finished', title: 'Export', type: 'info'})
        });
      })
    } catch(e) {
      console.log(e);
    }
  });
  socket.on('import', function(msg) {
    fs.readFile(msg.path[0], function(err, data) {
      var zip = new Zip();
      zip.loadAsync(data).then(function() {
        zip.file('/config.json').async('string').then(function(data) {
          fs.writeFile('config.json', data, "utf8");
          config = JSON.parse(data);
        });
        zip.folder("uploads").forEach(function(relativePath, file) {
          zip.file(file.name).nodeStream().pipe(fs.createWriteStream('static/img/' + file.name)).on('finish', function() {
            console.log("image " + file.name + " imported");
          })
        });
      });
    })
  })
});

var twit = new twitter(config.twitter);
var tweets = [];
var stream;
var selectedTweets = [];
function createTwitStream() {
  console.log(!!stream);
  console.log("creating twitter stream", config.twitter.hashtag);
  if(stream)
    stream.destroy();
  if(!config.twitter.hashtag)
    return;
  stream = twit.stream('statuses/filter', {track: config.twitter.hashtag});
  stream.on('data', function(msg) {
    if(msg.retweeted || msg.in_reply_to_screen_name != null || msg.text.substr(0,2) == "RT") { return; }
    tweets.push({
      screen_name: msg.user.screen_name,
      text: msg.text,
      id: msg.id
    });
    if(tweets.length > 10)
      tweets.shift();
    io.emit('tweet', tweets);
  });
}
createTwitStream();