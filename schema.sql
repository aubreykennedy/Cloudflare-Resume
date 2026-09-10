-- Schema + seed data for the aubreykennedy.com admin database (Cloudflare D1).
-- Apply locally:   npm run db:local
-- Apply to prod:   npm run db:remote
-- Safe to re-run: tables are created IF NOT EXISTS and seeds skip rows that already exist.

CREATE TABLE IF NOT EXISTS books (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  author      TEXT NOT NULL,
  genre       TEXT,
  status      TEXT NOT NULL DEFAULT 'finished',   -- finished | reading | queued
  notes       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,          -- higher = shown first
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS artworks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  medium      TEXT NOT NULL DEFAULT 'acrylic',     -- acrylic | makeup | watercolor | digital | other
  year        TEXT,
  caption     TEXT,
  image_key   TEXT NOT NULL,                       -- 'art/…' (R2 upload) or 'images/…' (file in the repo)
  width       INTEGER,
  height      INTEGER,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  principle   TEXT,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'done',        -- done | next
  image_key   TEXT,                                -- optional photo: 'art/…' in R2
  sort_order  INTEGER NOT NULL DEFAULT 0,          -- lower = shown first (numbered)
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------- seed: the reading archive (top of the list = most recent) ----------------
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'The Sexual Politics of Meat', '25th Anniversary Edition: A Feminist-Vegetarian Critical Theory', 'Carol J. Adams', 'Critical Theory', 'finished', 22 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'The Sexual Politics of Meat');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'Blind Spots', 'When Medicine Gets It Wrong, and What It Means for Our Health', 'Marty Makary MD', 'Public Health', 'finished', 21 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Blind Spots');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'The Perfect Predator', 'A Scientist''s Race to Save Her Husband from a Deadly Superbug: A Memoir', 'Steffanie Strathdee, Thomas Patterson, Teresa Barker', 'Microbiology & Memoir', 'finished', 20 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'The Perfect Predator');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'Adventures in the Louvre', 'How to Fall in Love with the World''s Greatest Museum', 'Elaine Sciolino', 'Art History', 'finished', 19 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Adventures in the Louvre');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'The Subtle Art of Not Giving a F*ck', 'A Counterintuitive Approach to Living a Good Life', 'Mark Manson', 'Behavioral Philosophy', 'finished', 18 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'The Subtle Art of Not Giving a F*ck');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'The Invention of Air', 'A Story of Science, Faith, Revolution, and the Birth of America', 'Steven Johnson', 'History of Science', 'finished', 17 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'The Invention of Air');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'The Fabric of Civilization', 'How Textiles Made the World', 'Virginia I. Postrel', 'Economic History', 'finished', 16 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'The Fabric of Civilization');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'How to Kill a Witch', 'The Patriarchy''s Guide to Silencing Women', 'Zoe Venditozzi, Claire Mitchell', 'Sociology', 'finished', 15 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'How to Kill a Witch');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'Original Sins', 'The (Mis)education of Black and Native Children and the Construction of American Racism', 'Eve L. Ewing', 'Social Policy & History', 'finished', 14 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Original Sins');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'The Unappreciated Power of Naps', 'Scientific Insights Into Sleep Optimization & Circadian Cycles', 'Jade Wu', 'Neuroscience', 'finished', 13 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'The Unappreciated Power of Naps');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'In Open Contempt', 'Confronting White Supremacy in Art and Public Space', 'Irvin Weathersby Jr.', 'Art Criticism', 'finished', 12 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'In Open Contempt');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'Epigenetics', 'How Environment Changes Your Biology', 'Charlotte Mykura', 'Genetics', 'finished', 11 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Epigenetics');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'What Do You Care What Other People Think?', 'Further Adventures of a Curious Character', 'Richard P. Feynman, Ralph Leighton', 'Biographical Physics', 'finished', 10 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'What Do You Care What Other People Think?');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'Surely You''re Joking, Mr. Feynman!', 'Adventures of a Curious Character', 'Richard P. Feynman', 'Biographical Physics', 'finished', 9 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Surely You''re Joking, Mr. Feynman!');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'Everything Is Tuberculosis', 'The History and Persistence of Our Deadliest Infection', 'John Green', 'Epidemiology', 'finished', 8 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Everything Is Tuberculosis');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'Higgs', 'The Invention and Discovery of the ''God Particle''', 'Jim Baggott, Steven Weinberg (Foreword)', 'Theoretical Physics', 'finished', 7 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Higgs');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'What the Dead Know', 'Learning About Life as a New York City Death Investigator', 'Barbara Butcher', 'Forensics & Memoir', 'finished', 6 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'What the Dead Know');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'Confessions of a Cartel Hit Man', 'A Memoir of Real-World Geopolitical Narcotic Structures', 'Martin Corona, Tony Rafael', 'True Crime Memoir', 'finished', 5 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Confessions of a Cartel Hit Man');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'Poverty, by America', 'Investigating the Systems Sustaining Inequality', 'Matthew Desmond', 'Economic Sociology', 'finished', 4 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Poverty, by America');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'Missing Microbes', 'How the Overuse of Antibiotics Is Fueling Our Modern Plagues', 'Martin J. Blaser', 'Microbiology', 'finished', 3 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Missing Microbes');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'How the Universe Got Its Spots', 'Diary of a Finite Time in a Finite Space', 'Janna Levin', 'Astrophysics & Cosmology', 'finished', 2 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'How the Universe Got Its Spots');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'The Blind Watchmaker', 'Why the Evidence of Evolution Reveals a Universe Without Design', 'Richard Dawkins', 'Evolutionary Biology', 'finished', 1 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'The Blind Watchmaker');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'Alex & Me', 'How a Scientist and a Parrot Discovered a Hidden World of Animal Intelligence, and Formed a Deep Bond in the Process', 'Irene M. Pepperberg', 'Animal Cognition & Memoir', 'finished', 26 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Alex & Me');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'When Crack Was King', 'A People''s History of a Misunderstood Era', 'Donovan X. Ramsey', 'Social History', 'finished', 25 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'When Crack Was King');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'Midnight in Chernobyl', 'The Untold Story of the World''s Greatest Nuclear Disaster', 'Adam Higginbotham', 'History of Science', 'finished', 24 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Midnight in Chernobyl');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'The Neuroscientist Who Lost Her Mind', 'My Tale of Madness and Recovery', 'Barbara K. Lipska, Elaine McArdle', 'Neuroscience & Memoir', 'finished', 23 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'The Neuroscientist Who Lost Her Mind');
INSERT INTO books (title, subtitle, author, genre, status, sort_order) SELECT 'QED', 'The Strange Theory of Light and Matter', 'Richard P. Feynman', 'Quantum Electrodynamics', 'finished', 27 WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'QED');

-- ---------------- seed: the paintings already in the repo ----------------
INSERT INTO artworks (title, medium, year, image_key, sort_order) SELECT 'Butterfly', 'makeup', '', 'images/makeup-butterfly.JPG', 9 WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image_key = 'images/makeup-butterfly.JPG');
INSERT INTO artworks (title, medium, year, image_key, sort_order) SELECT 'First Painting! (2014)', 'acrylic', '2014', 'images/painting-flowers-2014.jpg', 8 WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image_key = 'images/painting-flowers-2014.jpg');
INSERT INTO artworks (title, medium, year, image_key, sort_order) SELECT 'Flowers in a Field', 'acrylic', '', 'images/painting-flowers-and-clouds.jpg', 7 WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image_key = 'images/painting-flowers-and-clouds.jpg');
INSERT INTO artworks (title, medium, year, image_key, sort_order) SELECT 'Mountain Peak', 'acrylic', '', 'images/painting-mountain.jpg', 6 WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image_key = 'images/painting-mountain.jpg');
INSERT INTO artworks (title, medium, year, image_key, sort_order) SELECT 'Flowers in Glass', 'acrylic', '', 'images/painting-flowers-in-glass.jpg', 5 WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image_key = 'images/painting-flowers-in-glass.jpg');
INSERT INTO artworks (title, medium, year, image_key, sort_order) SELECT 'Pink Mountains', 'acrylic', '', 'images/painting-pink-mountain.jpg', 4 WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image_key = 'images/painting-pink-mountain.jpg');
INSERT INTO artworks (title, medium, year, image_key, sort_order) SELECT 'Swampy Landscape', 'acrylic', '', 'images/painting-swamp.jpg', 3 WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image_key = 'images/painting-swamp.jpg');
INSERT INTO artworks (title, medium, year, image_key, sort_order) SELECT 'Ocean Beach-scape', 'acrylic', '', 'images/painting-beach.jpg', 2 WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image_key = 'images/painting-beach.jpg');
INSERT INTO artworks (title, medium, year, image_key, sort_order) SELECT 'Green & Burgundy', 'makeup', '', 'images/makeup-green-burgandy-2.jpeg', 1 WHERE NOT EXISTS (SELECT 1 FROM artworks WHERE image_key = 'images/makeup-green-burgandy-2.jpeg');

-- ---------------- seed: engineering projects (CrunchLabs Build Box kits) ----------------
INSERT INTO projects (name, principle, description, status, sort_order) SELECT 'Infrared (IR) Turret', 'Infrared sensing, signal filtering', 'Infrared receivers decode a modulated signal and drive the turret motors.', 'done', 1 WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Infrared (IR) Turret');
INSERT INTO projects (name, principle, description, status, sort_order) SELECT 'Domino Robot', 'Kinematics, linkages', 'A cam mechanism turns motor rotation into a load-and-place cycle.', 'done', 2 WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Domino Robot');
INSERT INTO projects (name, principle, description, status, sort_order) SELECT 'Label Maker', 'Indexing, escapements', 'A dial and feed wheel advance the tape and align the stamp.', 'done', 3 WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Label Maker');
INSERT INTO projects (name, principle, description, status, sort_order) SELECT 'Sand Garden', 'Magnetism, planetary gears', 'A magnet under the tray, driven by planetary gears, draws patterns in sand.', 'done', 4 WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Sand Garden');
INSERT INTO projects (name, principle, description, status, sort_order) SELECT 'Laser Tag', 'Optics, light sensors', 'A lens collimates the beam; light-dependent resistors register the pulses.', 'done', 5 WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Laser Tag');
INSERT INTO projects (name, principle, description, status, sort_order) SELECT 'Balance Bot', 'Center of mass, inverted pendulum', 'An inverted pendulum. How mass distribution affects stability and recovery.', 'done', 6 WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Balance Bot');
INSERT INTO projects (name, principle, description, status, sort_order) SELECT 'Card Dealing Robot', 'Friction, feed rollers', 'Next build. Feed rollers that separate one card at a time from a deck.', 'next', 7 WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Card Dealing Robot');
