# LaskaKit Half Proto Breadboard

## What it is

Despite the word `breadboard` in the title, this is not just a temporary solderless board. The vendor description says it is a `PCB` laid out like a half-size solderless breadboard, so you can transfer a validated prototype into a more permanent soldered form while keeping the same connectivity pattern.

That makes it very useful between "works on the desk" and "ready for final demo".

## Verified key facts

- Product type: prototyping PCB / proto board
- Vendor description says the pad connections mirror a solderless breadboard layout
- Dimensions: `81 x 48 mm`
- Material: `FR-4`
- Grid: `0.1 in (2.54 mm)`
- Thickness: `1.6 mm`
- Hole diameter: `0.9 mm`

## Why it is interesting for the project

- Lets you keep a breadboard-like layout while making the prototype much more stable
- Good bridge step before designing a custom PCB
- Reduces random contact issues compared with a solderless board

## What to watch during the project

- You still need to solder cleanly; bad solder joints are just a different failure mode
- It is more permanent than Dupont-on-breadboard wiring, but still not equal to a custom PCB
- Large module overhang, bad strain relief, or repeated cable movement can still break the build

## Best use in this project

- Final MVP assembly
- Mid-project stabilization after wiring is validated
- Demo hardware that needs to survive transport better than a solderless breadboard

## Bad use in this project

- If your pinout is still changing every day
- If you expect production-level ruggedness
- If you need compact enclosure optimization

## Inference for project use

- This is probably the smartest hardware upgrade you can make after the first prototype starts working.
- It gives you a much better chance that the final presentation hardware still works after travel and handling.

## Sources

- LaskaKit product page: https://www.laskakit.cz/laskkit-half-proto-breadboard/
