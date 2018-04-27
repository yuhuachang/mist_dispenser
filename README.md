# README #

A mist dispenser capable of three dispensers, one RGB led theme light, one humidity (analog) sensor, and is controllable from web page using websocket.

### Hardware and pin out ###
1. Linkit Smart 7688 Due x 1
2. Linkit Smart 7688 Due breakout board x 1 (optional)
3. Ultra sound mist dispenser x 3 connecting to digital pin 6, 7, 8.
4. A set of RGB LEDs (parallel connected) x 1 set (totally 3 LEDs) connecting to PWM pin 9, 10, 11.
5. Humidity sensor (analog sensor) x 1 connecting to analog input pin A0.

### Installation ###
1. Reference to Linkit Smart 7688 developers' guide, download and install firmata code into Arduino.
   https://gist.github.com/edgarsilva/e73c15a019396d6aaef2
   (edgarsilva/StandardFirmataForATH0.ino)
2. Copy the code into 7688 board.  If main space is insufficient, try copy them into /tmp.
3. Go to the project dir and run:  ./run_server.sh

### Usage ###
1. The board need to be in Station Mode.
2. After the server is running, connect to it at port 8080 using web browser.
3. You should see live chart and control panel.