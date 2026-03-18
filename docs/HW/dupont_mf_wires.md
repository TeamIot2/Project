# Dupont M-F Jumper Wires

## What they are

These are `40` jumper wires, `male-to-female`, length `20 cm`.

They are not sensors, but they matter for prototype reliability because every weak connection turns into fake sensor problems.

## Verified key facts

- Bundle size: `40` wires
- Connector type: `M-F`, male-to-female
- Length: `20 cm`
- Vendor page states the wires can be separated from the ribbon
- Vendor page states `1-pin Dupont` connectors
- Vendor page mentions `bronze contacts`

## Why they matter in the project

- Fast assembly on breadboards and module headers
- Useful for swapping sensors during debugging
- Good for the MVP stage when your wiring is still changing

## What to watch during the project

- Dupont jumpers are mechanically weak compared with crimped locking connectors.
- Long loose wires increase analog noise pickup.
- Repeated plugging bends contacts and reduces connection quality.
- Poor jumper seating is one of the fastest ways to create fake intermittent bugs.

## Best use in this project

- Bench prototyping
- Sensor bring-up
- Temporary validation wiring
- Educational demos where you may rewire things often

## Bad use in this project

- Final installation in a vibrating enclosure
- Permanent field deployment
- Carrying higher current loads
- Long analog microphone runs

## Inference for project use

- Use these heavily during development.
- Replace them with shorter, cleaner, more permanent interconnects before your final demo if the assembly has to be moved.

## Sources

- LaskaKit product page: https://www.laskakit.cz/dupont-propojovaci-kabely-m-f-40ks-samec-samice--20cm-/
