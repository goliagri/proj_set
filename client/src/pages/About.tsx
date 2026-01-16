/**
 * About Page
 *
 * Explains the game rules with examples.
 */

import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/game/Card';

export function About() {
  const navigate = useNavigate();

  // Example cards for demonstrations
  const exampleSet = [
    { id: 'ex1', value: 17 },  // 010001
    { id: 'ex2', value: 5 },   // 000101
    { id: 'ex3', value: 20 },  // 010100
  ];

  const nonExampleSet = [
    { id: 'nex1', value: 17 }, // 010001
    { id: 'nex2', value: 5 },  // 000101
    { id: 'nex3', value: 10 }, // 001010
  ];

  return (
    <div className="page">
      <h1 className="page-title">About Projective Set</h1>

      <div className="page-content about-content">
        <section className="mb-xl">
          <h2>The Game</h2>
          <p className="mt-md">
            <a href="https://en.wikipedia.org/wiki/Projective_Set_(game)" target="_blank" rel="noopener noreferrer">Projective Set</a> is a pattern-matching card game played with a deck of 63 unique cards.
            Each card displays 1-6 colored dots in specific positions. Your goal is to find
            "sets" among the face-up cards.
          </p>
        </section>

        <section className="mb-xl">
          <h2>What is a Set?</h2>
          <p className="mt-md">
            A set is any group of cards (minimum 3) where each dot position appears an{' '}
            <strong>even number of times</strong> across all cards. If
            no cards have a dot in a position, that counts as even (0 times).
          </p>

          <div className="example-section mt-lg">
            <h3>Valid Set Example</h3>
            <div className="card-example flex gap-md mt-md">
              {exampleSet.map(card => (
                <Card
                  key={card.id}
                  card={card}
                  displayMode="standard"
                  isSelected={false}
                />
              ))}
            </div>
            <p className="mt-sm text-secondary">
              Binary: 010001 + 000101 + 010100 = each position has 0 or 2 ones
            </p>
          </div>

          <div className="example-section mt-lg">
            <h3>Invalid Set Example</h3>
            <div className="card-example flex gap-md mt-md">
              {nonExampleSet.map(card => (
                <Card
                  key={card.id}
                  card={card}
                  displayMode="standard"
                  isSelected={false}
                />
              ))}
            </div>
            <p className="mt-sm text-secondary">
              Binary: 010001 + 000101 + 001010 = position 1 has 1 one (odd), not a set
            </p>
          </div>
        </section>

        <section className="mb-xl">
          <h2>How to Play</h2>
          <ol className="mt-md" style={{ paddingLeft: 'var(--spacing-lg)' }}>
            <li>7 cards are dealt face-up on the table</li>
            <li>Click cards to select them</li>
            <li>When your selection forms a valid set, claim it</li>
            <li>New cards are dealt to replace the claimed ones</li>
            <li>Continue until the deck is empty and no sets remain</li>
            <li>The player with the most cards (or points) wins.</li>
          </ol>
        </section>

        <section className="mb-xl">
          <h2>Card Representation</h2>
          <p className="mt-md">
            Each card can be thought of as a 6-bit binary number. The 6 bits correspond
            to 6 dot positions. A "1" means the dot is present; "0" means it's absent.
          </p>
          <p className="mt-sm">
            In standard mode, each position has a unique color for easy identification.
            Binary mode shows the raw 6-bit representation.
          </p>
        </section>

        <div className="text-center mt-xl">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
