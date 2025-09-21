
import type { Note, Tag } from './types';

export const allTags: Tag[] = [
  { id: 'hindi', name: 'Hindi' },
  { id: 'tamil', name: 'Tamil' },
  { id: 'devotional', name: 'Devotional' },
  { id: 'rock', name: 'Rock' },
  { id: 'pop', name: 'Pop' },
  { id: 'instrumental', name: 'Instrumental' },
  { id: 'chords', name: 'Chords' },
  { id: 'intro', name: 'Intro' },
  { id: 'performance', name: 'Performance' },
];

export const allNotes: Note[] = [
  {
    id: '1',
    title: 'Maa Tujhe Salaam',
    content: `Yahan vahan saara jahan dekh liya hai
(Am)Kahin bhi tere jaisa (G)koi nahi hai
(Am)Assi nahin, sau din (G)duniya ghuma hai
(C)Kahin bhi tere jaisa (F)koi nahi
(G)Main gaya jahan bhi, (C)bas teri yaad thi
Jo (G)mere saath thi (C)mujhko tadpaati rulaati
Sabse (F)pyaari teri surat
(G)Pyaar hai bas tera, (C)pyaar hi
(C)Maa tujhe salaam, (Am)maa tujhe salaam
(G)Amma tujhe salaam
(C)Vande Mataram, (Am)Vande Mataram
(G)Vande Mataram, (C)Vande Mataram`,
    tags: ['hindi', 'pop'],
    artist: 'A.R. Rahman',
    album: 'Vande Mataram',
    created_at: '2023-10-26T15:30:00Z',
    updated_at: '2025-09-20T17:18:00Z',
    metadata: 'Standard Tuning',
    references: 'https://youtu.be/dn_jS1KFuAA'
  },
  {
    id: '2',
    title: 'Bohemian Rhapsody',
    content: `Is this the real life? Is this just fantasy?
Caught in a (Bb)landslide, no escape from (C)reality.
Open your (Gm)eyes, look up to the skies and (Bb7)see,
I'm just a (Eb)poor boy, I need no (Bb)sympathy,
Because I'm (B)easy come, (Bb)easy go, (A)little high, (Bb)little low,
(Eb)Any way the wind (Bb/D)blows doesn't really (C#dim)matter to (F7/C)me, to (Bb)me.`,
    tags: ['rock'],
    artist: 'Queen',
    album: 'A Night at the Opera',
    created_at: '2023-10-25T15:30:00Z',
    updated_at: '2023-10-25T15:30:00Z',
    metadata: 'E-flat Major'
  },
  {
    id: '3',
    title: 'Krishna Nee Begane',
    content: `(Cm)Krishna nee begane baaro
(Fm)Krishna nee begane baaro
(Cm)Begane baaro (G)mukhavannu toro
(Cm)Kaalalandhuge (G)gejje, (Cm)neelada (G)bavuli
(Cm)Neelavarnane (G)naatya(Cm)daaduva baaro`,
    tags: ['devotional', 'instrumental'],
    artist: 'Various Artists',
    album: 'Carnatic Fusion',
    created_at: '2023-11-01T11:00:00Z',
    updated_at: '2023-11-01T11:00:00Z',
    metadata: 'Yamunakalyani Raga'
  },
  {
    id: '4',
    title: 'Munbe Vaa',
    content: `(D)Munbe vaa en (Bm)anbe vaa
(G)Oone vaa uyire (A)vaa
(D)Munbe vaa en (Bm)anbe vaa
(G)Poo poovai poopom (A)vaa
(D)Naan naana keten (F#m)ennai naane
(G)Naan neeya nenjam (A)sonnathe
(D)Munbe vaa en (Bm)anbe vaa
(G)Oone vaa uyire (A)vaa`,
    tags: ['tamil', 'pop'],
    artist: 'A.R. Rahman',
    album: 'Sillunu Oru Kaadhal',
    created_at: '2023-11-05T18:45:00Z',
    updated_at: '2023-11-05T18:45:00Z',
  },
  {
    id: '5',
    title: 'Hotel California',
    content: `(Am)On a dark desert highway, (E7)cool wind in my hair
(G)Warm smell of colitas, (D)rising up through the air
(F)Up ahead in the distance, (C)I saw a shimmering light
(Dm)My head grew heavy and my sight grew dim, (E)I had to stop for the night`,
    tags: ['rock'],
    artist: 'Eagles',
    album: 'Hotel California',
    created_at: '2023-11-08T12:20:00Z',
    updated_at: '2023-11-08T12:20:00Z',
    metadata: 'Capo 7',
    references: 'https://tabs.ultimate-guitar.com/tab/eagles/hotel-california-chords-46190'
  },
  {
    id: '6',
    title: 'Dhun',
    metadata: `Original Key: G Minor
Time Signature: 4/4
Tempo: 66
Strumming: D UUD UUD DU
Capo: 3rd Fret`,
    content: `INTRO (FINGERSTYLE)

(tabs without capo)
e | - - -3 - 6-5 - 6-5 - 6-5 - - - - - - - - - - - - - - - - -
B | - 3- - - - - - - - - - - - - -6/8 - 10-8 - 10-8 - 10-8 - 

e | - - -3 - 6-5 - 6-5 - 6-5 - - 6/8 - 6- -5/3 - - 
B | - 3- - - - - - - - - - - - - - - - - - - - - - - - -


(Em) Hmm mm mm

(Em)Mm mm
H(C)m mm, oh oh
(Em)Oh oh oh oh
(C)Oh oh oh oh, oh oh

VERSE ONE
Sh(Em)ohratein to nahi hain mi(D)li
Naa ra(Bm)ees hoon main b(C)ada
Jeb me(Em)in hai nahi kuch ma(D)gar
Aas (C)hai jo wo s(D)un le zar(Em)a

CHORUS (VERY SLOW STRUM)
Tere iss d(Em)il ko churaane(D) ke liye
Hai ya(Bm)hi ek dhu(C)n
Sanam ko a(Em)pna banaa(D)ne ke liye
Hai y(Bm)ahi ek dh(C)un (D)
Hai y(Bm)ahi ek d(C)hun

POST CHORUS (STRUM)
H(Em)o oh, aa(C) oh oh
N(Em)a ne ei(C)n ein

VERSE TWO
J(D)ab bhi barsaat a(Em)aye, palk(C)on mein dhaank lung(D)a
N(D)a kami koi khal(Em)egi, tujhe i(C)tna pyaar dung(Em)a
C(D)haand taare le a(Em)aun, hai y(C)e to mumkin nah(D)i
P(D)ar vaada hai ye ka(Em)sam se, tere saa(C)th main rahun(Em)ga

tere saa(C)th main rahun(Em)ga (D) (C)

[FINGERSTYLE]
Ye ma(Em)in daawa nahi kar ra(D)ha
Koi T(Bm)aj Mahal hai me(C)ra
Naam (Em)ki chand deewarein (D)hain
Jinko h(C)i ghar main k(D)ehta r(Em)aha

CHORUS (STRUM)
Tere iss gh(Em)ar ko saja(D)ane ke liye
Hai y(Bm)ahi ek dh(C)un (D)

Sanam ko a(Em)pna banaa(D)ne ke liye
Hai y(Bm)ahi ek dh(C)un (D)
Hai y(Bm)ahi ek d(C)hun

POST CHORUS
H(Em)o oh oh o(C)h oh
H(Em)e ae ae a(C)e ___Ek dhun........ x2


OUTRO
Tere iss dil ko churaane ke liye
Hai yahi ek dhun`,
    tags: ['chords', 'hindi', 'intro', 'performance'],
    artist: 'Arijit Singh',
    album: 'Saiyaara',
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
  }
];
