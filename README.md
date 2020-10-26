## Features
- One button for on and make double x2 espresso
- MQTT control
- Set power off timeout

## Demo
[![](https://img.youtube.com/vi/kQxe32HY0Xw/0.jpg)](https://www.youtube.com/watch?v=kQxe32HY0Xw)

## MQTT commands
- commands/power [0/1]
- commands/force/power
- commands/coffee
- commands/force/coffee
- commands/coffee-x2
- commands/coffee-script

## MQTT sensors
- connected
- leds/coffee [ON/OFF/BLINK]
- leds/error [ERROR]

## Wiring
- Power button: D1 (relay)
- Coffee button: D2 (relay)
- Error led: D6
- Coffee led: D7
- Connect ESP Ground to Redmond Ground

## Config options
- `app.mqtt_topic` - MQTT base topic, default: `redmond-rcm-1512`
- `app.power_off_timeout_sec` - Power off idle timeout, default: `300`
- `app.power_gpio` - GPIO to use for power button, default: `D1`
- `app.coffee_gpio` - GPIO to use for power button, default: `D2`
- `app.error_led_gpio` - GPIO to use for error led: `D6`
- `app.coffee_led_gpio` - GPIO to use for 2x espresso led: `D7`

## Flashing
``` sh
mos build
mos flash
mos wifi ssid password
mos config-set mqtt.server=host mqtt.user=username mqtt.pass=password
```
