#!/usr/bin/env node
//
// To enable ECMAScript 2015 features, use the following command to run:
//   node --harmony app.js
//
"use strict";
process.title = 'node-app';

// Import libraries
const webSocketServer = require('websocket').server;
const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const os = require('os');
const firmata = require('firmata');

// Settings
const HTTP_PORT = 8080;
const WEBSOCKET_PORT = 1337;

// Global objects
var sensor = null; // humidity sensor
var dispensers = []; // mist dispenser (totally three of them)
var themeLight = null; // RGB LED


////////////////////////////////////////////////////////////////////////////////
// Get current server ip address.
var interfaces = os.networkInterfaces();
var addresses = [];
for (let k in interfaces) {
  for (let k2 in interfaces[k]) {
    let address = interfaces[k][k2];
    if (address.family === 'IPv4' && !address.internal) {
      addresses.push(address.address);
    }
  }
}
console.log('ip addresses: ', addresses);

////////////////////////////////////////////////////////////////////////////////
// http server to server the static pages
var server = http.createServer(function(request, response) {

  // Get request resource name.  default index.html
  let uri = url.parse(request.url).pathname;
  if (uri === '/') {
    uri = '/index.html';
  }
  console.log('uri: ', uri);

  // Settings. (have server settings sent back to the client)
  if (uri === '/settings.js') {
    response.writeHead(200, {'Content-Type': 'text/javascript'});
    let ip = '127.0.0.1';
    if (addresses.length == 1) {
      ip = addresses[0];
    } else {
      for (let i = 0; i < addresses.length; i++) {
        if (addresses[i] != '192.168.100.1') {
          ip = addresses[i];
          break;
        }
      }
    }
    response.write('var ip = "' + ip + '";' + "\n");
    response.write('console.log("ip = " + ip);' + "\n");
    response.end();
    return;
  }

  // Get path name on the server's file system.
  let filename = path.join(process.cwd(), uri);
  console.log('filename: ', filename);

  // Return the request resources.
  fs.exists(filename, function(exists) {
    if(exists) {
      let mimeTypes = {
        "html": "text/html",
        "jpeg": "image/jpeg",
        "jpg": "image/jpeg",
        "png": "image/png",
        "js": "text/javascript",
        "css": "text/css"
      };
      let mimeType = mimeTypes[path.extname(filename).split(".")[1]];
      // console.log('mimeType: ', mimeType);
      response.writeHead(200, mimeType);
      let fileStream = fs.createReadStream(filename);
      // console.log('fileStream: ', fileStream);
      fileStream.pipe(response);
    } else {
      response.writeHead(200, {'Content-Type': 'text/plain'});
      response.write('404 Not Found\n');
      response.end();
    }
  });
});

// Listen http port.
server.listen(HTTP_PORT, function(){
  console.log(new Date() + " HTTP Server listening on %s", HTTP_PORT);
});

////////////////////////////////////////////////////////////////////////////////
// WebSocket server
let wsServer = new webSocketServer({
  httpServer: server
});

wsServer.on('request', function(request) {
  console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
  let connection = request.accept(null, request.origin);
  console.log((new Date()) + ' Connection accepted.');

  // Handle user request
  connection.on('message', function(message) {
    //console.log('received: ', message);
    if (message.type === 'utf8') {
      let msg = JSON.parse(message.utf8Data);
      //console.log(msg);

      // Change Theme
      if (msg.type === 'theme') {
        if (themeLight) {
          console.log(new Date() + ' change theme: ' + msg.index);
          themeLight.start(msg.index);
        }
      }

      // Change Dispenser
      if (msg.type === 'dispenser') {
        if (dispensers[msg.index]) {
          console.log(new Date() + ' change dispenser[' + msg.index + ']: isRunning: ' + msg.isRunning + ' interval: ' + msg.interval);
          if (msg.isRunning) {
            let value = msg.interval * 100;
            dispensers[msg.index].start(value);
          } else {
            dispensers[msg.index].stop();
          }
        }
      }
    }
  });

  // Client disconnected
  connection.on('close', function(connection) {
      console.log('client disconnected.');
  });

  // Send state to websocket clients.
  setInterval(function() {

    // Get current state.
    let state = getState();
    
    // Print out the state (this will very many...)
    //console.log(new Date(), state);

    // Send status to clients.
    connection.sendUTF(JSON.stringify(state));

    //
    // Sample Control Logic.
    // Write anything you want the device to do automatically here.
    //
    // if (dispensers.length > 0) {
    //   var v = Math.floor(state.sensor / 100) * 100;
    //   v += 200;
    //   // console.log(v);
    //   dispensers[0].start(v);
    // }
  }, 100);
});



////////////////////////////////////////////////////////////////////////////////
// Linkit Smart 7688 Duo - Arduino Board with Firmata Lib.
var board = new firmata.Board("/dev/ttyS0", function(err) {
  if (err) {
    console.log(err);
    board.reset();
    return;
  }
  console.log(new Date() + ' Board connected. Firmware: ', board.firmware);

  //
  // Hardware Setup. (Change pins here...)
  //
  sensor = new HumiditySensor(0);

  themeLight = new ThemeLight(9, 10, 11);

  // Default theme (RGB)
  themeLight.start(6);

  dispensers = [
    new MistDispenser(6),
    new MistDispenser(7),
    new MistDispenser(8)
  ];

  // for (let i = 0; i < dispensers.length; i++) {
  //   console.log(dispensers[i].getState());
  // }

  // // Default dispenser turn on... (for testing...)
  // for (let i = 0; i < dispensers.length; i++) {
  //   dispensers[i].start(500);
  // }

  // for (let i = 0; i < dispensers.length; i++) {
  //   console.log(dispensers[i].getState());
  // }

});

////////////////////////////////////////////////////////////////////////////////
// Catch Ctrl-C Signal
process.on('SIGINT', function() {
  console.log("Caught interrupt signal");
  for (let i = 0; i < dispensers.length; i++) {
    dispensers[i].stop();
  }
  themeLight.stop();
  process.exit();
});

////////////////////////////////////////////////////////////////////////////////
// Global function to get current status of the board.
let getState = function() {

  // utility function to padding zeros
  let addZero = function (x, n) {
    while (x.toString().length < n) {
        x = "0" + x;
    }
    return x;
  }

  // current state
  let state = {};

  // current time
  let t = new Date();
  let h = addZero(t.getHours(), 2);
  let m = addZero(t.getMinutes(), 2);
  let s = addZero(t.getSeconds(), 2);
  let ms = addZero(t.getMilliseconds(), 3);
  state.time = h + ':' + m + ':' + s + '.' + ms;

  // sensor value
  state.sensor = sensor == null ? null : sensor.value;

  // dispenser values
  state.dispensers = [];
  for (let i = 0; i < dispensers.length; i++) {
    state.dispensers.push(dispensers[i].getState());
  }

  // theme light status
  state.themeLight = themeLight == null ? null : themeLight.getState();
  return state;
}

////////////////////////////////////////////////////////////////////////////////
// Humidity Sensor Class
// Humidity sensor has reads from analog input pin.
function HumiditySensor(pin) {
  board.pinMode(pin, board.MODES.ANALOG);
  this.callback = function(value) {
    this.value = value;
  };
  board.analogRead(pin, this.callback.bind(this));

  // Return sensor states.
  this.getState = function() {
    return {
      pin: pin,
      value: this.value
    };
  };
};

////////////////////////////////////////////////////////////////////////////////
// Mist Dispenser Class
function MistDispenser(pin) {
  console.log('init mist dispenser at pin ' + pin);
  board.pinMode(pin, board.MODES.OUTPUT);
  this.s = undefined;
  this.interval = -1;
  this.isOn = false; // if dispenser (or LED) is in action.

  // if dispenser is enabled (running).
  this.isRunning = function() {
    if (typeof this.s === 'undefined') {
      return false;
    }
    return true;
  }

  // private
  this.turnOn = function() {
    board.digitalWrite(pin, board.HIGH);
    this.isOn = true;
    setTimeout(function() {
      board.digitalWrite(pin, board.LOW);
      this.isOn = false;
    }.bind(this), 200);
  };

  // Start the dispenser with the desired interval.
  this.start = function(interval) {
    console.log('start dispenser pin: ' + pin + ' interval: ' + this.interval + ' -> ' + interval);
    this.enabled = true;
    this.interval = interval;
    this.stop();
    this.s = setInterval(this.turnOn.bind(this), this.interval);
  };

  // Stop the dispenser
  this.stop = function() {
    console.log('stoping dispenser ' + pin + ' ...');
    if (this.s) {
      board.digitalWrite(pin, board.LOW);
      this.isOn = false;
      clearInterval(this.s);
      this.s = undefined;
      console.log('dispenser ' + pin + ' stopped');
    }
  };

  // Get dispenser states.

  this.getState = function() {
    return {
      pin: pin,
      interval: this.interval,
      isOn: this.isOn,
      isRunning: this.isRunning()
    };
  };
};

////////////////////////////////////////////////////////////////////////////////
function ThemeLight(Rpin, Gpin, Bpin) {
  console.log('init RGB LED at (R, G, B) pings (' + Rpin + ', ' + Gpin + ', ' + Bpin + ")");
  board.pinMode(Rpin, board.MODES.PWM);
  board.pinMode(Gpin, board.MODES.PWM);
  board.pinMode(Bpin, board.MODES.PWM);

  this.currentInterval = undefined;
  this.currentTheme = undefined;

  this.Rvalue = 0;
  this.Gvalue = 0;
  this.Bvalue = 0;
  this.r = 0;
  this.g = 0;
  this.b = 0;

  this.themes = [
    function() {
      /*
       * Theme R
       *   switch only red.
       */
      console.log('Theme R');
      this.stop();
      let r = 10;
      this.currentInterval = setInterval(function() {
        this.Rvalue += r;
        if (this.Rvalue >= 250) {
          this.Rvalue = 250;
          r = -10;
        } else if (this.Rvalue < 0) {
          this.Rvalue = 0;
          r = 10;
        }
        board.analogWrite(Rpin, this.Rvalue);
      }.bind(this), 200);
    }.bind(this),
    function() {
      /*
       * Theme G
       *   switch only green.
       */
      console.log('Theme G');
      this.stop();
      let g = 10;
      this.currentInterval = setInterval(function() {
        this.Gvalue += g;
        if (this.Gvalue >= 250) {
          this.Gvalue = 250;
          g = -10;
        } else if (this.Gvalue < 0) {
          this.Gvalue = 0;
          g = 10;
        }
        board.analogWrite(Gpin, this.Gvalue);
      }.bind(this), 200);
    }.bind(this),
    function() {
      /*
       * Theme B
       *   switch only blue.
       */
      console.log('Theme B');
      this.stop();
      let b = 10;
      this.currentInterval = setInterval(function() {
        this.Bvalue += b;
        if (this.Bvalue >= 250) {
          this.Bvalue = 250;
          b = -10;
        } else if (this.Bvalue < 0) {
          this.Bvalue = 0;
          b = 10;
        }
        board.analogWrite(Bpin, this.Bvalue);
      }.bind(this), 200);
    }.bind(this),
    function() {
      /*
       * Theme RG
       *   switch only red and green.
       */
      console.log('Theme RG');
      this.stop();
      let r = 10;
      let g = 0;
      this.currentInterval = setInterval(function() {
        this.Rvalue += r;
        this.Gvalue += g;
        if (this.Rvalue >= 250) {
          this.Rvalue = 250;
          this.Gvalue = 0;
          r = -10;
          g = 10;
        } else if (this.Rvalue <= 0) {
          this.Rvalue = 0;
          this.Gvalue = 250;
          r = 10;
          g = -10;
        }
        board.analogWrite(Rpin, this.Rvalue);
        board.analogWrite(Gpin, this.Gvalue);
      }.bind(this), 200);
    }.bind(this),
    function() {
      /*
       * Theme RB
       *   switch only red and blue.
       */
      console.log('Theme RB');
      this.stop();
      let r = 10;
      let b = 0;
      this.currentInterval = setInterval(function() {
        this.Rvalue += r;
        this.Bvalue += b;
        if (this.Rvalue >= 250) {
          this.Rvalue = 250;
          this.Bvalue = 0;
          r = -10;
          b = 10;
        } else if (this.Rvalue <= 0) {
          this.Rvalue = 0;
          this.Bvalue = 250;
          r = 10;
          b = -10;
        }
        board.analogWrite(Rpin, this.Rvalue);
        board.analogWrite(Bpin, this.Bvalue);
      }.bind(this), 200);
    }.bind(this),
    function() {
      /*
       * Theme GB
       *   switch only green and blue.
       */
      console.log('Theme GB');
      this.stop();
      let g = 10;
      let b = 0;
      this.currentInterval = setInterval(function() {
        this.Gvalue += g;
        this.Bvalue += b;
        if (this.Gvalue >= 250) {
          this.Gvalue = 250;
          this.Bvalue = 0;
          g = -10;
          b = 10;
        } else if (this.Gvalue <= 0) {
          this.Gvalue = 0;
          this.Bvalue = 250;
          g = 10;
          b = -10;
        }
        board.analogWrite(Gpin, this.Gvalue);
        board.analogWrite(Bpin, this.Bvalue);
      }.bind(this), 200);
    }.bind(this),
    function() {
      /*
       * Theme RGB
       *   switch only red, green, and blue.
       */
      console.log('Theme RGB');
      this.stop();
      let stage = 0;
      let r = 10;
      let g = 0;
      let b = 0;
      this.currentInterval = setInterval(function() {
        this.Rvalue += r;
        this.Gvalue += g;
        this.Bvalue += b;
        switch (stage) {
          case 0:
            if (this.Rvalue >= 250) {
              this.Rvalue = 250;
              this.Gvalue = 0;
              r = -10;
              g = 10;
              b = 0
            } else if (this.Rvalue <= 0) {
              this.Rvalue = 0;
              this.Gvalue = 250;
              r = 0;
              g = -10;
              b = 10;
              stage = 1;
            }
            break;
          case 1:
            if (this.Gvalue >= 250) {
              this.Gvalue = 250;
              this.Bvalue = 0;
              r = 0;
              g = -10;
              b = 10
            } else if (this.Gvalue <= 0) {
              this.Gvalue = 0;
              this.Bvalue = 250;
              r = 10;
              g = 0;
              b = -10;
              stage = 2;
            }
            break;
          case 2:
            if (this.Bvalue >= 250) {
              this.Bvalue = 250;
              this.Rvalue = 0;
              r = 10;
              g = 0;
              b = -10
            } else if (this.Bvalue <= 0) {
              this.Bvalue = 0;
              this.Rvalue = 250;
              r = -10;
              g = 10;
              b = 0;
              stage = 0;
            }
            break;
        }
        board.analogWrite(Rpin, this.Rvalue);
        board.analogWrite(Gpin, this.Gvalue);
        board.analogWrite(Bpin, this.Bvalue);
      }.bind(this), 200);
    }.bind(this)
  ];

  this.start = function(index) {
    if (index < 0 || index >= this.themes.length) {
      console.log('request theme change index ' + index + ' out of range!');
      return;
    }
    this.currentTheme = index;
    this.themes[this.currentTheme]();
  }

  this.stop = function() {
    if (this.currentInterval) {
      clearInterval(this.currentInterval);
      console.log('stop RGB LED.');
    }
    this.Rvalue = 0;
    this.Gvalue = 0;
    this.Bvalue = 0;
    board.analogWrite(Rpin, this.Rvalue);
    board.analogWrite(Gpin, this.Gvalue);
    board.analogWrite(Bpin, this.Bvalue);
  };

  this.getState = function() {
    return {
      Rpin: Rpin,
      Gpin: Gpin,
      Bpin: Bpin,
      currentTheme: this.currentTheme,
      Rvalue: this.Rvalue,
      Gvalue: this.Gvalue,
      Bvalue: this.Bvalue
    };
  };
};
