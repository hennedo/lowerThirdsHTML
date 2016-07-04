var app = angular.module('presenter', [
  'ngSocket',
  'ngAnimate'
]);
app.config(function($sceProvider) {
  $sceProvider.enabled(false);
});
app.controller('lowerthirdCtrl', function($scope, socket, $timeout, $animate) {
  var config, tweetHideTime, showtime;
  socket.on('config', function(msg) {
    config = msg;
    showtime = parseInt(config.lowerThird.showtime);
    var subtitle = parseInt(config.lowerThird.subtitleStyles['outDelay']) + parseInt(config.lowerThird.subtitleStyles['outDuration']);
    var title = parseInt(config.lowerThird.titleStyles['outDelay']) + parseInt(config.lowerThird.titleStyles['outDuration']);
    tweetHideTime = title;
    if(subtitle > title)
      tweetHideTime = subtitle;
    $scope.images = config.lowerThird.images;
  });
  socket.on('styles', function(msg) {
    $scope.styles = msg;
    socket.emit('getConfig', {});
  });
  socket.emit('getStyles', {});

  function set(title, subtitle) {
    $scope.title = title;
    $scope.subtitle = subtitle;
    $scope.show = true;
  }

  var tweets;

  function hide() {
    $scope.title = "";
    $scope.subtitle = "";
    $scope.show = false;
  }

  function nextTweet(first) {
    if(tweets.length == 0)
      return hide();
    else
      $timeout(nextTweet, config.lowerThird.twitter.delay);

    var tweet = tweets.shift();
    $scope.title = "";
    $scope.subtitle = "";
    if(first) {
      set("@" + tweet.screen_name, tweet.text);
    } else {
      $timeout(function() {
        set("@" + tweet.screen_name, tweet.text);
      }, tweetHideTime + 10);
    }

  }
  socket.on('show', function(msg) {
    if($scope.show) {
      hide();
      $timeout(function() {
        setInstant(msg.title, msg.subtitle, msg.id);
      }, 3000);
    } else {
      setInstant(msg.title, msg.subtitle, msg.id);
    }
  });

  function setInstant(title, subtitle, id) {
    set(title, subtitle);
    $scope.id = id;
    if(showtime)
      $timeout(function() {
        if($scope.id === id)
          hide();
      }, showtime);
  }
  socket.on('hide', function() {
    hide();
  });
  socket.on('showTweets', function(msg) {
    tweets = msg;
    nextTweet(true);
  });
});

jQuery.emojifyWholePage();