# Projective Set Web Application

This project implements the card game Projective Set as a web application.  The main improvement over other existing implementations is online multiplayer.

## Detailed Description

### The Game:

The base game Projective Set is played with a deck of 63 cards. Each card has 1-6 differently colored and placed dots on it; the color and placement are two different ways of visually communicating the same attribute. Each card can be thought of as representing a 6-digit binary number, where each digit represents the presence of a dot in a specific position. The cards are unique and cover all 6-digit binary numbers except 000000.

At the beginning of the game, the deck is shuffled, and 7 cards are drawn and placed face up on the table. Players attempt to identify a subset of these face-up cards that form a 'set'. A set occurs when the number of occurrences of each of the 6 dot variants is even. A set can be any number of cards, though because each card is unique, it will necessarily be at least size 3. For a binary example, 010001 000101 010100 is a set because the first, third, and fifth positions are never 1, while the 2nd, 4th, and 6th positions are 1 exactly twice; so all positions have the value 1 an even number of times. When a player successfully picks out a set, they take the cards and put them in a pile in front of them. Then, new cards are dealt face up from the deck until there are again 7 cards on the table. The game continues until the deck is empty and no more sets can be found. The player with the most cards in their pile wins.

### The Interface:

#### Main Menu

Users who go to the site will find a main menu with the following options:

* **Single player game:** Navigates the user to a settings menu for configuring a single-player game. That menu has a "play" button that initiates the game.
* **Multiplayer game:** Navigates the user to a settings menu for configuring a multiplayer game. That menu has a "create lobby" and a "join lobby" button.
* **About:** Navigates the user to a page that explains the game and its rules. It has a thorough textual description of the rules, as well as some examples/counterexamples of sets. It should mention the mathematical property that with 7 cards dealt, there is always at least one valid set (a theorem from projective geometry related to the Fano plane). It also has a "back" button to return to the main menu.

#### Single Player Settings Menu

A settings menu for configuring the game 

It has togglable buttons
- Colors: default mode - On, if off then the dots on the cards are all grey
- Binary mode: default mode - Off, if on then the cards are featureless except for a binary representation of the information.
- Turn Timer: default mode - Off, when toggled on, a text box becomes writable next to it (with default value 1 minute). A timer is added to the game screen which starts from that value and counts down. Resetting every time the player gets a set. If the timer reaches 0, the player loses the game.
- Game Timer: default mode - Off, when toggled on, a text box becomes writable next to it (with default value 15 minutes). A timer is added to the game screen which starts from that value and counts down. If the timer reaches 0, the player loses the game.
- Set found behavior: two modes - default mode - 'take after click'. Once a user finds a set, it is locked in, but is not removed until the user clicks on any of the cards again. During this time the card selection effect changes to a green outline. The other mode is 'take immediately'. Once a user finds a set, the cards are moved to their discard pile without any additional confirmation. 
- Infinite Deck: default mode - Off, when toggled on, when a player gets a set, the cards in the set are shuffled back into the deck, so the deck never runs out of cards. The total count of cards the player has found in sets is still recorded and displayed.
- Back: returns to the main menu.
- Start: starts a single player game with the selected settings.

### Multiplayer Menu

A very basic menu with the following options: 

- an option 'create lobby' which navigates the user to the lobby screen. Initializes a new multiplayer game lobby with the default settings and generates a unique game code. The user is added to the lobby as the lobby host. The game code is displayed on the screen.

- an option 'join lobby', along with a text box labeled lobby code. When the user enters a valid lobby code and clicks the join lobby button, they are navigated to the lobby screen. The user is added to the lobby and can see the other players in the lobby. 

### Multiplayer Lobby screen

A shared screen visible to all players in the lobby. It contains a series of setting options similar to the single player menu, plus:

- Scoring Mode: default mode - 'cards'. In 'cards' mode, players score points equal to the number of cards in each set they claim. In 'sets' mode, each valid set is worth 1 point regardless of size.

It also contains
- A ready button, which when clicked, marks the player as ready.
- A start button only visible and usable by the host, which when clicked, starts the game for all players in the lobby.
- A 'unlock settings to all players / lock settings to host only' toggle switch, which when toggled on, allows all players to change the settings. When toggled off, only the host can change the settings. Default is toggled off. 
- A list of all players currently in the lobby, along with their ready status in the top right of the screen. Each player also has some string p1, p2, ... pn associated with them assinged in order of how they joined the lobby
- A chat functionality in the bottom left of the screen
- the game code in the top left of the screen
- a back button in the top left of the screen, which navigates the user back to the multiplayer menu.

### Single Player Game screen

A screen where the user plays the game. It contains the game board, the turn timer and/or the game timer if applicable, and a back button in the top left of the screen, which navigates the user back to the main menu.

The game board contains the following elements:
- The deck: a stack of cards that will automatically be dealt on the table. It visually displays a card back, and when the user mouses over it displays the number of cards left in the deck.
- The player's discard pile: A stack of cards that are in sets the player has found. It visually displays the top card of the pile, and when the user mouses over it displays the number of cards in the pile.
- The active cards: The cards that are currently being played. They are displayed in a 2x4 grid layout (with one empty slot) displayed face up. The user can click on a card to select it, and click again to deselect it. When a card is selected it has a slight yellow gradiant around its perimiter. 

Functionality: Ever time the user selects/deselects a card, the group of selected cards are evaluated for if they are a set, if so then the cards are removed from the active cards and added to the player's discard pile. Then new cards are dealt from the deck. If not nothing happens. At the start of the game a full set of active cards are dealt from the deck. When the deck and the active cards are empty the game ends. The player is then navigated to the game over screen.

If timers are activated, then they are also displayed and updated accordingly. A turn timer is for the time the player has to get each individual set (and resets when they get it). A game timer is for the total time the player has to get all the sets in the deck. When either timer runs out the game ends and the player is navigated to the game over screen.


### Multi Player Game screen

The multi player game screen is similar to the single player game screen, but with the following differences:
- Multiple players are all selecting cards and claiming sets simultaneously (no turns). When a player completes a valid set, they claim it immediately—the first player to form a valid selection wins those cards. In 'take after click' mode, the first player to form a valid selection AND confirm it claims the set. Other players' selections on those cards are cleared.
- There is a chat box at the bottom of the screen where players can type messages to each other. The chat box displays messages from all players in the game (this is the same chat box as in the lobby)
- There is a scoreboard on the right side of the screen that displays the score of each player in the game. The score is the number of sets the player has gotten.
- Each player has a color associated with them, when they have a card selected, the card is highlighted with their color, and also above the top right of the card is a small 'px' icon with their color (where x is their player number). If multiple players select the same card, the one who selected it last has their color shown. When a player claims a set, and take on click mode is enabled the cards are highlighted more intensely with their color (instead of the green from single player). 
- When a player finds a set and claims it, a brief +x animation is shown next to their name on the scoreboard where x is the number of points they got for the set.
- When the game ends, the ending screen displays the scoreboard prominently and the chat box is still active.



