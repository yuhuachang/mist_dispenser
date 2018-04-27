$(function () {
  "use strict";

  let ipAddr = $('#ipAddr');
  let sensor = $('#sensor');
    
  let r = $('#r');
  let g = $('#g');
  let b = $('#b');

  let themes = [
    $('#themeR'),
    $('#themeG'),
    $('#themeB'),
    $('#themeRG'),
    $('#themeRB'),
    $('#themeGB'),
    $('#themeRGB')
  ];

  // Set theme setting bindings
  for (let i = 0; i < themes.length; i++) {
    themes[i].on('click', function() {
      console.log('theme[' + i + ']');
      connection.send(JSON.stringify({ type: 'theme', index: i }));
    });
  }

  let dispensers = [
    $('#dispenser0'),
    $('#dispenser1'),
    $('#dispenser2')
  ];

  for (let i = 0; i < dispensers.length; i++) {
    let slider = dispensers[i];
    if (slider.length > 0) {
      slider.slider({
        min: 0,
        max: 5,
        value: 4,
        orientation: "horizontal",
        range: "min"
      }).addSliderSegments(slider.slider("option").max);
    }
  }

  let switches = [
    $('#switch-0'),
    $('#switch-1'),
    $('#switch-2')
  ];

  let switchToggleLocks = [];
  let sliderLocks = [];

  let intervalSliders = [
    $('#interval-slider-0'),
    $('#interval-slider-1'),
    $('#interval-slider-2')
  ];

  let indicators = [
    $('#indicator-0'),
    $('#indicator-1'),
    $('#indicator-2')
  ];

  let dispenserControl = function(index, isRunning, interval) {
    console.log('mist dispenser ' + index + ': isRunning=' + isRunning + ' interval=' + interval);
    connection.send(JSON.stringify({
      type: 'dispenser',
      index: index,
      isRunning: isRunning,
      interval: interval
    }));
  }

  // Register switch change event handler.  Send control message to server.
  for (let i = 0; i < switches.length; i++) {
    switches[i].on('switchChange.bootstrapSwitch', function(event, state) {

      // lock this switch
      switchToggleLocks[i] = new Date();

      var interval = intervalSliders[i].slider("option", "value");
      console.log(i + ': isRunning=' + state + ' interval=' + interval);
      dispenserControl(i, state, interval);
    });
  }

  for (let i = 0; i < intervalSliders.length; i++) {
    let $slider = intervalSliders[i];

    $slider.slider({
      min: 2, // min value
      max: 12, // max value
      value: 5, // init value
      orientation: "horizontal",
      range: "min"
    }).addSliderSegments($slider.slider("option").max);

    $slider.on('slidestop', function(event, ui) {
      if (typeof switchToggleLocks[i] === 'undefined') {

        let isRunning = switches[i].bootstrapSwitch('state');
        console.log(i + ': isRunning=' + isRunning + ' interval=' + ui.value + ' last toggle time: ' + switchToggleLocks[i]);

        // send instruction to server.
        dispenserControl(i, isRunning, ui.value);
      } else {
        // console.log('switch just toggled, waiting server update...');
      }
    });

    $slider.on('mousedown', function(event, ui) {
      sliderLocks[i] = new Date(); // lock the slider to prevent ui update.
      console.log(i + ' sliderLocks = ' + sliderLocks[i]);
    });

    $slider.on('mouseup', function(event, ui) {
      sliderLocks[i] = undefined; // release the lock to enable ui update.
      console.log(i + ' sliderLocks = ' + sliderLocks[i]);
    });
  }

  let dispenserIntervals = [
    $('#dispenser0-interval'),
    $('#dispenser1-interval'),
    $('#dispenser2-interval')
  ];

  // server ip address
  ipAddr.text(ip);

  // make chart responsive
  Chart.defaults.global.responsive = true;

  // chart
  let ctx = $("#myChart");
  let startingData = {
    labels: [''],
    datasets: [
      {
        label: "Sensor Value",
        fill: true,
        lineTension: 0.1,
        backgroundColor: "rgba(75,192,192,0.4)",
        borderColor: "rgba(75,192,192,1)",
        borderCapStyle: 'butt',
        borderDash: [],
        borderDashOffset: 0.0,
        borderJoinStyle: 'miter',
        pointBorderColor: "rgba(75,192,192,1)",
        pointBackgroundColor: "#fff",
        pointBorderWidth: 1,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "rgba(75,192,192,1)",
        pointHoverBorderColor: "rgba(220,220,220,1)",
        pointHoverBorderWidth: 2,
        pointRadius: 1,
        pointHitRadius: 10,
        data: [0],
      },
      {
        label: "Red",
        fill: false,
        lineTension: 0.1,
        backgroundColor: "rgba(175,92,92,0.4)",
        borderColor: "rgba(175,92,92,1)",
        borderCapStyle: 'butt',
        borderDash: [],
        borderDashOffset: 0.0,
        borderJoinStyle: 'miter',
        pointBorderColor: "rgba(175,92,92,1)",
        pointBackgroundColor: "#fff",
        pointBorderWidth: 1,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "rgba(175,92,92,1)",
        pointHoverBorderColor: "rgba(220,220,220,1)",
        pointHoverBorderWidth: 2,
        pointRadius: 1,
        pointHitRadius: 10,
        data: [0],
      },
      {
        label: "Green",
        fill: false,
        lineTension: 0.1,
        backgroundColor: "rgba(92,175,92,0.4)",
        borderColor: "rgba(92,175,92,1)",
        borderCapStyle: 'butt',
        borderDash: [],
        borderDashOffset: 0.0,
        borderJoinStyle: 'miter',
        pointBorderColor: "rgba(92,175,92,1)",
        pointBackgroundColor: "#fff",
        pointBorderWidth: 1,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "rgba(92,175,92,1)",
        pointHoverBorderColor: "rgba(220,220,220,1)",
        pointHoverBorderWidth: 2,
        pointRadius: 1,
        pointHitRadius: 10,
        data: [0],
      },
      {
        label: "Blue",
        fill: false,
        lineTension: 0.1,
        backgroundColor: "rgba(92,92,175,0.4)",
        borderColor: "rgba(92,92,175,1)",
        borderCapStyle: 'butt',
        borderDash: [],
        borderDashOffset: 0.0,
        borderJoinStyle: 'miter',
        pointBorderColor: "rgba(92,92,175,1)",
        pointBackgroundColor: "#fff",
        pointBorderWidth: 1,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "rgba(92,92,175,1)",
        pointHoverBorderColor: "rgba(220,220,220,1)",
        pointHoverBorderWidth: 2,
        pointRadius: 1,
        pointHitRadius: 10,
        data: [0],
      }
    ]
  };

  // put empty init data.
  for (let i = 0; i < 40; i++) {
    startingData.labels.push('');
    for (let j = 0; j < startingData.datasets.length; j++) {
      startingData.datasets[j].data.push(0);
    }
  }

  let myLiveChart = new Chart(ctx, {
    type: 'line',
    data: startingData,
    options: {
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true
          }
        }]
      }
    }
  });

  // if user is running mozilla then use it's built-in WebSocket
  window.WebSocket = window.WebSocket || window.MozWebSocket;

  // if browser doesn't support WebSocket, just show some notification and exit
  if (!window.WebSocket) {
    content.html($('<p>', {
      text: 'Sorry, but your browser doesn\'t support WebSockets.'
    }));
    input.hide();
    $('span').hide();
      return;
  }

  // open connection
  let connection = new WebSocket('ws://' + ip + ':8080');

  connection.onopen = function () {
    // first we want users to enter their names
    //console.log('on open');
  };

  connection.onerror = function (error) {
    // just in there were some problems with conenction...
    console.log('on error ', error);
  };

  // most important part - incoming messages
  connection.onmessage = function (message) {
    // try to parse JSON message. Because we know that the server always returns
    // JSON this should work without any problem but we should make sure that
    // the massage is not chunked or otherwise damaged.
    let json = undefined;
    try {
      json = JSON.parse(message.data);
    } catch (e) {
      console.log('This doesn\'t look like a valid JSON: ', message.data);
      return;
    }

    // print every message from server (very be many...)
    // console.log('JSON: ', json);

    // Remove old label so we dont add values forever
    if (startingData.labels.length > 40) {
      startingData.labels.shift();
    }

    // Add label
    startingData.labels.push(json.time);

    // sensor
    if (typeof json.sensor !== 'undefined') {
      sensor.text(json.sensor);

      // Remove old sensor data so we dont add values forever
      if (startingData.labels.length > 40) {
        startingData.datasets[0].data.shift();
      }

      // Add sensor data
      startingData.datasets[0].data.push(json.sensor);
    }

    // mist dispenser
    if (json.dispensers) {
      for (let i = 0; i < json.dispensers.length; i++) {
        
        // console.log('from server: ', json.dispensers[i]);

        // update dispenser interval and slider
        if (!sliderLocks[i]) {
          dispenserIntervals[i].text(json.dispensers[i].interval);
          intervalSliders[i].slider('value', json.dispensers[i].interval / 100);
        }

        // update running status indicator
        if (typeof indicators[i] !== 'undefined') {
          if (json.dispensers[i].isOn) {
            indicators[i].css('visibility', 'visible');
          } else {
            indicators[i].css('visibility', 'hidden');
          }
        }

        // check if we just change the switch state.
        // if we just changed the switch state, wait a while for server update.
        if (switchToggleLocks[i]) {
          // if the state from server matches what we just did,
          // or if the change cannot be made after 3 seconds, release the lock.
          if (switches[i].bootstrapSwitch('state') === json.dispensers[i].isRunning || new Date - switchToggleLocks[i] > 3000) {
            // console.log('release lock ' + i);
            switchToggleLocks[i] = undefined;
          }
        } else {
          // update switch state
          if (switches[i].bootstrapSwitch('state') !== json.dispensers[i].isRunning) {
            // console.log('change swtich ' + i + ' to ' + json.dispensers[i].isRunning);
            switches[i].bootstrapSwitch('state', json.dispensers[i].isRunning);
          }
        }
      }
    }

    // theme light
    if (json.themeLight) {
      // current theme r g b values.
      r.text(json.themeLight.Rvalue);
      g.text(json.themeLight.Gvalue);
      b.text(json.themeLight.Bvalue);

      // Remove old signal data
      if (startingData.labels.length > 40) {
        startingData.datasets[1].data.shift();
        startingData.datasets[2].data.shift();
        startingData.datasets[3].data.shift();
      }

      // Add signal data
      startingData.datasets[1].data.push(json.themeLight.Rvalue);
      startingData.datasets[2].data.push(json.themeLight.Gvalue);
      startingData.datasets[3].data.push(json.themeLight.Bvalue);

      // change css on current theme button
      if (!themes[json.themeLight.currentTheme].hasClass('btn-primary')) {
        // console.log('current theme: ' + json.themeLight.currentTheme);
        for (let i = 0; i < themes.length; i++) {
          if (i == json.themeLight.currentTheme) {
            themes[i].removeClass('btn-default');
            themes[i].addClass('btn-primary');
          } else {
            themes[i].removeClass('btn-primary');
            themes[i].addClass('btn-default');
          }
        }
      }
    }

    // update chart
    myLiveChart.update();
  };


  // for (let i = 0; i < dispensers.length; i++) {
  //   console.log(dispensers[i]);
  //   dispensers[i].change(function() {
  //     console.log('dispenser[' + i + '] = ' + dispensers[i].val());
  //     connection.send(JSON.stringify({
  //       type: 'dispenser',
  //       index: i,
  //       isOn: true,
  //       interval: 500
  //     }));
  //   });
  // }
});