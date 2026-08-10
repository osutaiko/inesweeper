## [Inesweeper](https://inesweeper.com/) by osutaiko
<img width="2560" height="1500" alt="inesweeper" src="https://github.com/user-attachments/assets/7c966340-ea76-4c38-b40c-98cdcc0ff4f4" />

A Collection of Interesting Minesweeper Variants.

## Featured Modes

### Solo
<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Variant</th>
      <th>Description</th>
      <th>(Main) Inspirations</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>-</td>
      <td><strong>Classic</strong></td>
      <td>Classic, standard Minesweeper</td>
      <td>-</td>
    </tr>
    <tr>
      <td rowspan="3">Mine types</td>
      <td><strong>Multimines</strong></td>
      <td>Up to three mines in a single cell</td>
      <td><a href="https://coding4rtist.itch.io/minesweeper-reborn">Minesweeper Reborn</a>, <a href="https://sinseiki.github.io/mine.js/">mine.js</a></td>
    </tr>
    <tr>
      <td><strong>Omega</strong></td>
      <td>Positive and negative mines</td>
      <td><a href="https://duncanacnud.itch.io/omegasweeper">Omegasweeper</a>, <a href="https://heptaveegesimal.com/2018/advent-calendar/">Advent Calendar day 16</a></td>
    </tr>
    <tr>
      <td><strong>Colorful</strong></td>
      <td>Red, yellow, and blue mines with mixed neighboring mine colors as clues</td>
      <td><a href="https://nerdsweeper.com/">Nerd(Color)sweeper</a></td>
    </tr>
    <tr>
      <td rowspan="6">Number scheme</td>
      <td><strong>Liar</strong></td>
      <td>Numbers "lie" by displaying numbers one off from the actual value</td>
      <td><a href="https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/">14MV[L]</a></td>
    </tr>
    <tr>
      <td><strong>Amplified</strong></td>
      <td>Mines on every other cell count as two</td>
      <td><a href="https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/">14MV[M]</a>, <a href="https://heptaveegesimal.com/2018/advent-calendar/">Advent Calendar day 10</a></td>
    </tr>
    <tr>
      <td><strong>Contrast</strong></td>
      <td>Numbers represent the difference in the number of mines between neighboring red and blue cells</td>
      <td><a href="https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/">14MV[N]</a></td>
    </tr>
    <tr>
      <td><strong>Crossed</strong></td>
      <td>The numbers indicate the number of mines in a cross-shaped region within distance 2</td>
      <td><a href="https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/">14MV[X]</a></td>
    </tr>
    <tr>
      <td><strong>Knight's Path</strong></td>
      <td>The numbers indicate the number of mines in a chess knight's path</td>
      <td><a href="https://heptaveegesimal.com/2018/advent-calendar/">Advent Calendar day 4/8</a></td>
    </tr>
    <tr>
      <td><strong>Compass</strong></td>
      <td>Numbers are replaced by arrows pointing toward the average direction of mines in neighboring cells</td>
      <td>Original</td>
    </tr>
    <tr>
      <td>Number scheme</td>
      <td><strong>Nearest-2</strong></td>
      <td>The numbers indicate the distance to the second nearest mine</td>
      <td><a href="https://nerdsweeper.com/">Nerd(Distance)sweeper</a></td>
    </tr>
    <tr>
      <td rowspan="2">Mine generation</td>
      <td><strong>Domino</strong></td>
      <td>Mines are placed as orthogonally connected pairs</td>
      <td><a href="https://store.steampowered.com/app/1865060/14_Minesweeper_Variants/">14MV[Q]</a></td>
    </tr>
    <tr>
      <td><strong>Scattered</strong></td>
      <td>No two mines touch orthogonally</td>
      <td>Original</td>
    </tr>
  </tbody>
</table>

### Place
`Inesweeper Place` is the shared-board mode at [`/place`](https://inesweeper.com/place).

<table>
  <tr>
    <td>
      <img width="100%" alt="Place map view" src="https://github.com/user-attachments/assets/4d3f9b5d-29f9-4fed-ad10-25a1c74c3874" />
    </td>
    <td>
      <img width="1473" height="1599" alt="localhost_3000_place_solve" src="https://github.com/user-attachments/assets/4a0ee3df-bb26-4b80-997a-38a2de561ec2" />
    </td>
  </tr>
</table>

- Public infinite board divided by 16x16 chunks
- Claim a chunk by locking it and successfully solving

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
- [ ] Realtime PvP
