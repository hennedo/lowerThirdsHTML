
var app = angular.module('lowerThirdsHTMLApp', [
  'ngRoute',
  'colorpicker.module',
  'angularFileUpload',
  'ngSocket'
]);
app.config(['$routeProvider', '$locationProvider', '$sceProvider', function($routeProvider, $locationProvider, $sceProvider) {
  $sceProvider.enabled(false);
  $routeProvider.
  when('/', {
    templateUrl: 'partials/control.html',
    controller: 'controlCtrl'
  }).
  when('/twitter', {
    templateUrl: 'partials/twitter.html',
    controller: 'twitterCtrl'
  }).
  when('/config', {
    templateUrl: 'partials/config.html',
    controller: 'configCtrl',
    resolve: {
      config: function(config) { return config(); }
    }
  }).
  when('/config/appearance', {
    templateUrl: 'partials/config_appearance.html',
    controller: 'appearanceCtrl',
    resolve: {
      config: function(config) { return config(); }
    }
  });
}]);
app.run(function($rootScope, $route, $routeParams) {

  $rootScope.tab = function(route,path) {
    if(path) {
      return $route.current && route === $route.current.controller && $routeParams.selector === path;
    } else {
      return $route.current && route === $route.current.controller;
    }
  }
});
app.run(function($location, $rootScope, socket) {
  try {
    const remote = require('electron').remote;
    const dialog = remote.dialog;
    socket.on('message', function(msg) {
      dialog.showMessageBox({type: msg.type, buttons: ['OK'], title: msg.title, message: msg.msg})
    });
    var Menu = remote.Menu;
    var template = [

      {
        label: 'Edit',
        submenu: [
          {
            label: 'Appearance',
            click: function() {
              $rootScope.$apply(function() {
                $location.path('/config/appearance');
              })
            }
          },
          {
            label: 'Export',
            click: function() {
              dialog.showSaveDialog({title:'Export to...'}, function(f) {
                socket.emit('export', {path: f});
              })
            }
          },
          {
            label: 'Import',
            click: function() {
              dialog.showOpenDialog({title:'Import from...'}, function(f) {
                socket.emit('import', {path: f});
              })
            }
          },
          {
            label: 'Undo',
            accelerator: 'CmdOrCtrl+Z',
            role: 'undo'
          },
          {
            label: 'Redo',
            accelerator: 'Shift+CmdOrCtrl+Z',
            role: 'redo'
          },
          {
            type: 'separator'
          },
          {
            label: 'Cut',
            accelerator: 'CmdOrCtrl+X',
            role: 'cut'
          },
          {
            label: 'Copy',
            accelerator: 'CmdOrCtrl+C',
            role: 'copy'
          },
          {
            label: 'Paste',
            accelerator: 'CmdOrCtrl+V',
            role: 'paste'
          },
          {
            label: 'Select All',
            accelerator: 'CmdOrCtrl+A',
            role: 'selectall'
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Open Titler',
            click: function() {
              require('electron').shell.openExternal('http://localhost:3000')
            }
          },
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: function(item, focusedWindow) {
              if (focusedWindow)
                focusedWindow.reload();
            }
          },
          {
            label: 'Toggle Full Screen',
            accelerator: (function() {
              if (process.platform == 'darwin')
                return 'Ctrl+Command+F';
              else
                return 'F11';
            })(),
            click: function(item, focusedWindow) {
              if (focusedWindow)
                focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
            }
          },
          {
            label: 'Toggle Developer Tools',
            accelerator: (function() {
              if (process.platform == 'darwin')
                return 'Alt+Command+I';
              else
                return 'Ctrl+Shift+I';
            })(),
            click: function(item, focusedWindow) {
              if (focusedWindow)
                focusedWindow.webContents.toggleDevTools();
            }
          },
        ]
      },
      {
        label: 'Window',
        role: 'window',
        submenu: [
          {
            label: 'Minimize',
            accelerator: 'CmdOrCtrl+M',
            role: 'minimize'
          },
          {
            label: 'Close',
            accelerator: 'CmdOrCtrl+W',
            role: 'close'
          },
        ]
      },
      {
        label: 'Help',
        role: 'help',
        submenu: [
          {
            label: 'Learn More',
            click: function() { require('electron').shell.openExternal('http://electron.atom.io') }
          },
        ]
      },
    ];
    if (process.platform == 'darwin') {
      var name = require('electron').remote.app.getName();
      template.unshift({
        label: name,
        submenu: [
          {
            label: 'About ' + name,
            role: 'about'
          },
          {
            type: 'separator'
          },
          {
            label: 'Services',
            role: 'services',
            submenu: []
          },
          {
            type: 'separator'
          },
          {
            label: 'Hide ' + name,
            accelerator: 'Command+H',
            role: 'hide'
          },
          {
            label: 'Hide Others',
            accelerator: 'Command+Alt+H',
            role: 'hideothers'
          },
          {
            label: 'Show All',
            role: 'unhide'
          },
          {
            type: 'separator'
          },
          {
            label: 'Quit',
            accelerator: 'Command+Q',
            click: function() { app.quit(); }
          },
        ]
      });
      // Window menu.
      template[3].submenu.push(
        {
          type: 'separator'
        },
        {
          label: 'Bring All to Front',
          role: 'front'
        }
      );
    }
    var menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } catch(e) {

  }

});

app.factory('config', function(socket, $q) {
  return function() {
    var deferred = $q.defer();
    socket.on('config', function(msg) {
      deferred.resolve(msg);
    });
    socket.emit('getConfig', {});
    return deferred.promise;
  }
});
app.controller('controlCtrl', function($scope, socket) {
  socket.on('list', function(msg) {
    $scope.list = msg;
  });
  socket.emit('getList');
  $scope.show = function() {
    socket.emit('show', {title: $scope.title, subtitle: $scope.subtitle});
    return false;
  };
  $scope.hide =  function($event) {
    $event.preventDefault();
    socket.emit('hide', {});
  };
  $scope.add =  function($event) {
    $event.preventDefault();
    socket.emit('addList', {
      title: $scope.title,
      subtitle: $scope.subtitle
    });
  };
  $scope.remove =  function(item) {
    socket.emit('removeList', {
      id: item.id
    });
  };
  $scope.play = function($event) {
    socket.emit('playNext', {});
  };
  $scope.playItem = function(item) {
    socket.emit('playItem', item)
  };
  $scope.up = function(item) {
    socket.emit('upItem', item);
  };
  $scope.down = function(item) {
    socket.emit('downItem', item);
  };

});
app.controller('twitterCtrl', function($scope, socket) {
  $scope.selectedTweets = [];
  $scope.currentTweets = [];
  socket.on('tweet', function(msg) {
    $scope.currentTweets = msg;
  });
  socket.on('updateSelectedTweets', function(tweets) {
    $scope.selectedTweets = tweets;
  });
  socket.emit('updateTweets');
  $scope.selectTweet = function(tweet) {
    var exists = false;
    $scope.selectedTweets.forEach(function(i) {
      if(i.id == tweet.id) { exists = true;}
    });
    if(!exists) {
      socket.emit('selectTweet', tweet);
    }
  };
  $scope.deselectTweet = function(tweet) {
    socket.emit('deselectTweet', tweet);
  };
  $scope.showTweets = function() {
    socket.emit('showTweets',$scope.selectedTweets);
    $scope.selectedTweets = [];
  };
});
app.controller('configCtrl', function($scope, socket, config) {
  $scope.config = config;
  $scope.save = function() {
    socket.emit('config', $scope.config);
  };
});
app.controller('appearanceCtrl', function($scope, config, socket, FileUploader) {
  $scope.config = config;
  $scope.imgUploader = new FileUploader({url:'/upload', autoUpload: true});
  $scope.imgUploader.onSuccessItem = function(item, response) {
    $scope.config.lowerThird.images.push(response);
  };
  $scope.deleteImage = function(item) {
    for(var i=0; i<$scope.config.lowerThird.images.length; i++) {
      if($scope.config.lowerThird.images[i].url === item.url)
        $scope.config.lowerThird.images.splice(i, 1);
    }
    socket.emit('config', $scope.config);
  };
  $scope.fonts = ['Helvetica', 'Arial', 'Open Sans', 'Rock\'s Death', '"Helvetica Neue",Helvetica,Arial,sans-serif'];
  $scope.fontWeights = ['light', 'normal', 'bold'];
  $scope.textAlign = ['normal', 'left', 'right', 'justify'];
  $scope.animations = [
    { name: 'none', group: 'none'},
    { name: 'bounce', group: 'Attention Seekers'},
    { name: 'flash', group: 'Attention Seekers'},
    { name: 'pulse', group: 'Attention Seekers'},
    { name: 'rubberBand', group: 'Attention Seekers'},
    { name: 'shake', group: 'Attention Seekers'},
    { name: 'swing', group: 'Attention Seekers'},
    { name: 'tada', group: 'Attention Seekers'},
    { name: 'wobble', group: 'Attention Seekers'},
    { name: 'jello', group: 'Attention Seekers'},
    { name: 'bounceIn', group: 'Bouncing Entrances'},
    { name: 'bounceInDown', group: 'Bouncing Entrances'},
    { name: 'bounceInLeft', group: 'Bouncing Entrances'},
    { name: 'bounceInRight', group: 'Bouncing Entrances'},
    { name: 'bounceInUp', group: 'Bouncing Entrances'},
    { name: 'bounceOut', group: 'Bouncing Exits'},
    { name: 'bounceOutDown', group: 'Bouncing Exits'},
    { name: 'bounceOutLeft', group: 'Bouncing Exits'},
    { name: 'bounceOutRight', group: 'Bouncing Exits'},
    { name: 'bounceOutUp', group: 'Bouncing Exits'},
    { name: 'fadeIn', group: 'Fading Entrances'},
    { name: 'fadeInDown', group: 'Fading Entrances'},
    { name: 'fadeInDownBig', group: 'Fading Entrances'},
    { name: 'fadeInLeft', group: 'Fading Entrances'},
    { name: 'fadeInLeftBig', group: 'Fading Entrances'},
    { name: 'fadeInRight', group: 'Fading Entrances'},
    { name: 'fadeInRightBig', group: 'Fading Entrances'},
    { name: 'fadeInUp', group: 'Fading Entrances'},
    { name: 'fadeInUpBig', group: 'Fading Entrances'},
    { name: 'fadeOut', group: 'Fading Exits'},
    { name: 'fadeOutDown', group: 'Fading Exits'},
    { name: 'fadeOutDownBig', group: 'Fading Exits'},
    { name: 'fadeOutLeft', group: 'Fading Exits'},
    { name: 'fadeOutLeftBig', group: 'Fading Exits'},
    { name: 'fadeOutRight', group: 'Fading Exits'},
    { name: 'fadeOutRightBig', group: 'Fading Exits'},
    { name: 'fadeOutUp', group: 'Fading Exits'},
    { name: 'fadeOutUpBig', group: 'Fading Exits'},
    { name: 'flip', group: 'Flippers' },
    { name: 'flipInX', group: 'Flippers' },
    { name: 'flipInY', group: 'Flippers' },
    { name: 'flipOutX', group: 'Flippers' },
    { name: 'flipOutY', group: 'Flippers' },
    { name: 'lightSpeedIn', group: 'Lightspeed' },
    { name: 'lightSpeedOut', group: 'Lightspeed' },
    { name: 'rotateIn', group: 'Rotating Entrances' },
    { name: 'rotateInDownLeft', group: 'Rotating Entrances' },
    { name: 'rotateInDownRight', group: 'Rotating Entrances' },
    { name: 'rotateInUpLeft', group: 'Rotating Entrances' },
    { name: 'rotateInUpRight', group: 'Rotating Entrances' },
    { name: 'rotateOut', group: 'Rotating Exits' },
    { name: 'rotateOutDownLeft', group: 'Rotating Exits' },
    { name: 'rotateOutDownRight', group: 'Rotating Exits' },
    { name: 'rotateOutUpLeft', group: 'Rotating Exits' },
    { name: 'rotateOutUpRight', group: 'Rotating Exits' },
    { name: 'slideInDown', group: 'Sliding Entrances'},
    { name: 'slideInLeft', group: 'Sliding Entrances'},
    { name: 'slideInRight', group: 'Sliding Entrances'},
    { name: 'slideInUp', group: 'Sliding Entrances'},
    { name: 'slideOutDown', group: 'Sliding Exits'},
    { name: 'slideOutLeft', group: 'Sliding Exits'},
    { name: 'slideOutRight', group: 'Sliding Exits'},
    { name: 'slideOutUp', group: 'Sliding Exits'},
    { name: 'zoomIn', group: 'Zoom Entrances'},
    { name: 'zoomInDown', group: 'Zoom Entrances'},
    { name: 'zoomInLeft', group: 'Zoom Entrances'},
    { name: 'zoomInRight', group: 'Zoom Entrances'},
    { name: 'zoomInUp', group: 'Zoom Entrances'},
    { name: 'zoomOut', group: 'Zoom Exits'},
    { name: 'zoomOutDown', group: 'Zoom Exits'},
    { name: 'zoomOutLeft', group: 'Zoom Exits'},
    { name: 'zoomOutRight', group: 'Zoom Exits'},
    { name: 'zoomOutUp', group: 'Zoom Exits'},
    { name: 'hinge', group: 'Specials' },
    { name: 'rollIn', group: 'Specials' },
    { name: 'rollOut', group: 'Specials' }
  ];
  $scope.timingFunctions = ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end'];
  $scope.save = function() {
    socket.emit('config', $scope.config);
  };
  $scope.$watch('config', function() {
    socket.emit('updateStyles', $scope.config);
  }, true);
  socket.on('config', function(msg) {
    $scope.config = msg;
  })
});
