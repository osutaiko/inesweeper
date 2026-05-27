## [Inesweeper](https://inesweeper.vercel.app/) by osutaiko
![Inesweeper Image](https://github.com/user-attachments/assets/c809b44f-fbd3-4aeb-9e37-554ebf62d4ee)

A Collection of Interesting Minesweeper Variants.

## Featured Variants

### Classic
| Variant | Description |
|---|---|
| **Classic** | Classic, standard Minesweeper |

### Different mine types
| Variant | Description | (Main) Inspirations |
|---|---|---|
| **Multimines** | Up to three mines in a single cell | [Minesweeper Reborn](https://coding4rtist.itch.io/minesweeper-reborn), [mine.js](https://sinseiki.github.io/mine.js/) |
| **Omega** | Positive and negative mines | [Omegasweeper](https://duncanacnud.itch.io/omegasweeper), [Advent Calendar day 16](https://heptaveegesimal.com/2018/advent-calendar/) |

### Different number scheme
| Variant | Description | (Main) Inspirations |
|---|---|---|
| **Liar** | Numbers "lie" by displaying numbers one off from the actual value | [14MV[L]](https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/) |
| **Amplified** | Mines on every other cell count as two | [14MV[M]](https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/), [Advent Calendar day 10](https://heptaveegesimal.com/2018/advent-calendar/) |
| **Contrast** | Numbers represent the difference in the number of mines between neighboring red and blue cells | [14MV[N]](https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/) |
| **Crossed** | The numbers indicate the number of mines in a cross-shaped region within distance 2 | [14MV[X]](https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/) |
| **Knight's Path** | The numbers indicate the number of mines in a chess knight's path | [Advent Calendar day 4/8](https://heptaveegesimal.com/2018/advent-calendar/) |
| **Compass** | Numbers are replaced by arrows pointing toward the average direction of mines in neighboring cells | Original |

### Different mine generation
| Variant | Description | (Main) Inspirations |
|---|---|---|
| **Domino** | Mines are placed as orthogonally connected pairs | [14MV[Q]](https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/) |
| **Scattered** | No two mines touch orthogonally | Original |
## Philosophy
All variants featured in this site must have the exact same gameplay loop as Classic Minesweeper. Uncover all safe cells without stepping on a mine, numbers on a cell represent the mines around them in some way, and mines are randomly generated (unless I decide to add NG mode somehow). I don't want to add any game-breaking rulesets that doesn't feel like the original.

## TODO
- [ ] UI customization (color, contrast)
- [ ] No guessing mode: with universal solver (wip: solver.ts) or solvable board database
- [ ] Import/export games
- [ ] Playground
  - Board customization (height, width, mine count)
  - More grid types (triangular, hexagonal)
  - Combine rulesets
    
### Multiplayer modes
- [ ] Canvas: users can claim chunks by solving a part of a shared infinite board
- [ ] Realtime PvP
