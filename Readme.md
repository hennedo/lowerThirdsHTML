# Lower Third HTML
With lower third HTML you can create lower thirds in your browser! If you are using [Open Broadcaster Software](https://obsproject.com) you can install the browser plugin and overlay the presenter

## Features
  - Titles (With title and subtitle in the lower third)
  - Twitter (Twitter streaming API shows all incoming tweets, filtered by #hashtag)

### Usage
This app consists of two parts:
  - Presenter
  - Controller

Once the App is started, you get the presenter on http://localhost:3000/. The Window of the App will also the controller, but if you like, you can open the Controller on your Webbrowser on http://Localhost:3000/control.
If you are working together on networked machines, you can access the controller on multiple Computers by using the IP Address of your Computer e.g. http://192.168.0.100/control. Everything should be automatically synced across the open control windows.

### OBS Scene
Just put the Browser-Source Plugin over every other source in your scene. It's designed to be fullsize on the Video. The position and size can be configured in the Appearance section.

### Twitter
Just enter your Twitter API keys into the Webinterface/Config and select a filter value. Once the filter value is inserted, you get every tweet containing that value to your controller. Select some tweets and send those to the presenter.

### Version
0.1.0
### Installation
You will need to have nodeJS and NPM installed. Clone the git repository and cd into it, then
```sh
$ npm install
$ npm start
```

### Todo
  - Fix unhandled Error with twitter when offline.
  - Refactoring
  - Better Error Handling
  - Support for setting animated Fly's