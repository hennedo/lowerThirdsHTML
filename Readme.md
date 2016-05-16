# Lower Third HTML
With lower third HTML you can create lower thirds in your browser! If you are using [Open Broadcaster Software](https://obsproject.com) you can install the browser plugin and overlay the presenter

## Features
  - Titles (With title and subtitle in the lower third)
  - Twitterthird (Twitter streaming API shows all incoming tweets, filtered by #hashtag)

### Usage
This app consists of three parts:
  - NodeJS Server
  - Presenter
  - Controller
Once the nodeJS server is started, you get the presenter on http://localhost:3000/ and the controlling at http://localhost:3000/control

### Twitter
Just enter your twitter api keys into the config.js or in the webinterface and select a filter value. Once the filter value is inserted, you get every tweet containing that value to your controller. Select some tweets and send those to the presenter.

### Version
0.0.1
### Installation
You will need to have nodeJS and NPM installed. Clone the git repository and cd into it, then
```sh
$ npm install
$ node index.js
```

### Todo
  - Import Librarys
  - Fix unhandled Error with twitter when offline.