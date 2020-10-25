## Wiring
- Power button: D1 (relay)
- Coffee button: D2 (relay)
- Error led: D6
- Coffee led: D7
- Connect ESP Ground to Redmond Ground

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
