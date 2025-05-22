## [Inesweeper](https://inesweeper.vercel.app/) by osutaiko
![Inesweeper Image](https://github.com/user-attachments/assets/c809b44f-fbd3-4aeb-9e37-554ebf62d4ee)

A Collection of Interesting Minesweeper Variants.

## Featured Variants
| Variant           | Description                                                                 | Inspired By                                                                 |
|-------------------|-----------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| **Classic**       | The classic Minesweeper game                                                | -                                                                           |
| **Multimines**    | Up to four mines in a single cell                                           | [Minesweeper Reborn](https://coding4rtist.itch.io/minesweeper-reborn) by Coding4rtist |
| **Liar**          | Numbers "lie" by displaying numbers one off from the actual value           | [Lying Minesweeper](https://www.reddit.com/r/playmygame/comments/38l2n8/completed_web_lying_minesweeper/) by u/molodec, [14 Minesweeper Variants](https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/) |
| **Omega**         | Positive and negative mines                                                 | [Omegasweeper](https://duncanacnud.itch.io/omegasweeper) by duncanacnud      |
| **Amplified**     | Mines on every other cell count as two                                      | [14 Minesweeper Variants](https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/) |
| **Contrast**      | Numbers represent the difference in the number of mines between neighboring red and blue cells | [14 Minesweeper Variants](https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/) |
| **Crossed**       | The numbers indicate the number of mines in a cross-shaped region within distance 2 | [14 Minesweeper Variants](https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/) |
| **Knight's Path** | The numbers indicate the number of mines in a chess knight's path           | [Knights Path](https://heptaveegesimal.com/2018/advent-calendar/) from Minesweeper Advent Calendar by Joshua Gehre |

## Philosophy
All variants featured in this site must have the exact same gameplay loop as Classic Minesweeper. Uncover all safe cells without stepping on a mine, numbers on a cell represent the mines around them in some way, and mines are randomly generated (unless I decide to add NG mode somehow). I don't want to add any game-breaking rulesets that doesn't feel like the original.

## Planned Variants
- Edge: Mines can be placed between two cells, where each half counts as half a mine
- ~~Multiplayer mode (territorial expansion)~~

## TODO
- [ ] UI customization (color, contrast)
- [ ] No guessing mode: with universal solver (wip: solver.ts) or solvable board database
- [ ] Import/export games
- [ ] Playground
  - Board customization (height, width, mine count)
  - More grid types (triangular, hexagonal)
  - Combine rulesets
