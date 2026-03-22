# performative male 🍵

a snake game where you are him. collect the matcha, grow your trail of culturally significant objects.

## file structure

```
matcha-snake/
├── index.html          ← markup + overlay screens
├── style.css           ← all styling (Playfair Display + DM Mono)
├── game.js             ← game loop, collision, rendering
└── assets/
    ├── performativeMale.png   ← the head
    ├── matcha.png             ← the food
    ├── book.png               ← tail item
    ├── nailPolish.png         ← tail item
    ├── toteBag.png            ← tail item
    └── vinyl.png              ← tail item
```

## how to play

- **arrow keys** or **wasd** to move
- collect the iced matcha to grow your trail
- each new item behind you is a random pick from: book, nail polish, tote bag, vinyl
- the game speeds up every time you collect
- hit a wall or your own trail → game over

## tweaking

all the constants are at the top of `game.js`:

```js
const CELL       = 56;   // grid cell size in px
const COLS       = 12;   // grid columns
const ROWS       = 12;   // grid rows
const BASE_SPEED = 140;  // starting tick speed in ms (lower = faster)
const MIN_SPEED  = 65;   // fastest possible speed
const SPEED_STEP = 5;    // ms to shave off per matcha collected
```

want a bigger board? bump `COLS`/`ROWS`.  
want it harder from the start? lower `BASE_SPEED`.  
want more items in the tail rotation? add to `TAIL_ITEMS` in `game.js`.
