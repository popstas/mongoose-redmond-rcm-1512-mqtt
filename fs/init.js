// mongoose-redmond-rcm-1215-mqtt
load('api_config.js');
load('api_esp8266.js');
load('api_gpio.js');
load('api_i2c.js');
load('api_mqtt.js');
// load('api_sys.js');
load('api_timer.js');

print('### redmond-rcm-1215-mqtt');

let baseTopic = Cfg.get('app.mqtt_topic');

let power_pin = Cfg.get('app.power_gpio');
let coffee_pin = Cfg.get('app.coffee_gpio');
let error_led_pin = Cfg.get('app.error_led_gpio');
let coffee_led_pin = Cfg.get('app.coffee_led_gpio');
let board_led_pin = Cfg.get('board.led1.pin');

let notSameThreshold = 4; // сколько раз подряд должно измениться значение, чтобы определилось мигание
let sameThreshold = 4; // сколько раз подряд должно измениться значение, чтобы определилось не мигание
let errorTimeout = 4;
let errorMin = 2;

let ledTopics = {};
ledTopics[error_led_pin] = 'error';
ledTopics[coffee_led_pin] = 'coffee';

let waitForSecondCoffee = false;
let powerTimeout = 0;
let secondCoffeeTimeout = 0;

let ledState = {};
let ledPins = [error_led_pin, coffee_led_pin];
for (let i in ledPins) {
  let pin = ledPins[i];
  ledState[pin] = {
    lastValue: 0,
    // history: [],
    notSameCount: 0,
    sameCount: 0,
    state: 'OFF', // ON, BLINK
    topic: ledTopics[pin]
  }

  // print('pin:', pin);
  GPIO.setup_input(pin, GPIO.PULL_UP);
}

ledState[error_led_pin].errorAgo = 0;

GPIO.setup_output(power_pin, 1);
GPIO.setup_output(coffee_pin, 1);

GPIO.set_mode(board_led_pin, GPIO.MODE_OUTPUT);
// GPIO.set_pull(board_led_pin, GPIO.PULL_DOWN);
GPIO.write(board_led_pin, 1);
print('led pin:', board_led_pin);

function onLed(pin) {
  let val = GPIO.read(pin);
  let lastState = ledState[pin].state;

  // error led
  if (pin === error_led_pin) {
    if (val) {
      ledState[pin].errorAgo = 0;
      waitForSecondCoffee = false;
    }
    else {
      ledState[pin].errorAgo++;
    }

    if (ledState[pin].state === 'ERROR' && ledState[pin].errorAgo > errorTimeout) {
      ledState[pin].state = '';
    }
  }

  // coffee led
  if (pin === coffee_led_pin) {
    // notSameCount
    if (val !== ledState[pin].lastValue) {
      ledState[pin].notSameCount++;
      ledState[pin].sameCount = 0;
    } else {
      ledState[pin].notSameCount = 0;
      ledState[pin].sameCount++;
    }

    // state: blink
    if (ledState[pin].notSameCount >= notSameThreshold) {
      ledState[pin].state = 'BLINK';
    } else if (ledState[pin].sameCount > sameThreshold) {
      ledState[pin].state = val ? 'ON' : 'OFF';
    }
  }

  // print('led last:', ledState[pin].lastValue);
  ledState[pin].lastValue = val;
  // ledState[pin].history.push(val);

  // print('led val:', val);
  // print('led count:', ledState[pin].notSameCount);
  // print('led state:', ledState[pin].state);

  if (lastState !== ledState[pin].state) {
    let topic = baseTopic + '/leds/' + ledState[pin].topic;
    MQTT.pub(topic, ledState[pin].state);
  }
}

function startLedMonitor() {
  // диоды мигают раз в 0.5 сек, засекал по bpm
  Timer.set(500, Timer.REPEAT, function() {
    // print('monitor:');
    for (let i in ledPins){
      onLed(ledPins[i]);
    }
  }, null);
}

function pressBtn(pin) {
  print('pin on: ', pin);
  GPIO.write(pin, 0);
  // GPIO.write(ledPin, 0);

  Timer.set(1000, 0, function(data) {
    print('pin off: ', data.pin);
    GPIO.write(data.pin, 1);
    // GPIO.write(data.ledPin, 1);
  }, {pin: pin});
};





let topic;





MQTT.setEventHandler(function(conn, ev, edata) {
  if (ev === MQTT.EV_CONNACK) {
    print('mqtt connected, wait for publish...')
    Timer.set(1000, 0, function(data) {
      MQTT.pub(baseTopic + '/connected', '1');
      startLedMonitor();
    }, null);
  }
}, null);


function waitForCoffeeHandler() {
  if (!waitForSecondCoffee) return;

  if (ledState[coffee_led_pin].state === 'ON') {
    waitForSecondCoffee = false;
    MQTT.pub(baseTopic + '/command/coffee', '1');
  } else {
    Timer.set(5000, 0, waitForCoffeeHandler, null);
  }
}

MQTT.sub(baseTopic + '/command/coffee-script', function(conn, topic, msg) {
  print('sub: ' + topic + ': ' + msg);

  // ready, only coffee on
  if (ledState[coffee_led_pin].state === 'ON') {
    MQTT.pub(baseTopic + '/command/coffee-x2', '1');
  }

  // full script
  else {
    MQTT.pub(baseTopic + '/command/power', '1');

    Timer.del(powerTimeout);
    powerTimeout = Timer.set(60000, 0, function(data) {
      MQTT.pub(baseTopic + '/command/coffee-x2', '1');
    }, null);
  }
});


MQTT.sub(baseTopic + '/command/force/power', function(conn, topic, msg) {
  print('sub: ' + topic + ': ' + msg);
  waitForSecondCoffee = false;
  pressBtn(power_pin);
});

MQTT.sub(baseTopic + '/command/power', function(conn, topic, msg) {
  print('sub: ' + topic + ': ' + msg);
  waitForSecondCoffee = false;
  let state = ledState[coffee_led_pin].state;
  let isOn = state === 'ON' || state === 'BLINK';
  let isAllow = (!isOn && msg === '1') || (isOn && msg === '0');
  waitForSecondCoffee = false;

  if (isAllow) {
    pressBtn(power_pin);
  }
});

MQTT.sub(baseTopic + '/command/force/coffee', function(conn, topic, msg) {
  print('sub: ' + topic + ': ' + msg);
  waitForSecondCoffee = false;
  pressBtn(coffee_pin);
});

MQTT.sub(baseTopic + '/command/coffee-x2', function(conn, topic, msg) {
  print('sub: ' + topic + ': ' + msg);
  MQTT.pub(baseTopic + '/command/coffee', '1');
  waitForSecondCoffee = true;
  
  Timer.del(secondCoffeeTimeout);
  secondCoffeeTimeout = Timer.set(60000, 0, waitForCoffeeHandler, null);
});

// only when coffee led ON
MQTT.sub(baseTopic + '/command/coffee', function(conn, topic, msg) {
  print('sub: ' + topic + ': ' + msg);
  if (ledState[coffee_led_pin].state === 'ON') {
    pressBtn(coffee_pin);
  }
});
