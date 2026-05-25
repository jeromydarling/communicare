# Screencast — 90-second product walkthrough

Six scenes, 90 seconds total at 30 fps (2,700 frames). Music bed + on-screen
typography. **No voiceover.** Farms hear hired narration and distrust it.
Let the type carry the story; the soundtrack carries the mood.

Render: `cd remotion && npm run render:screencast`
Studio:  `cd remotion && npm run studio` (then pick "Screencast" in the
sidebar)
Poster:  `cd remotion && npm run still:screencast`

## Beat sheet

| # | Title              | Duration | Frame range | Visual                                                                                          |
|---|--------------------|----------|-------------|--------------------------------------------------------------------------------------------------|
| 1 | Cold open          | 10s      | 0–300       | Desktop browser frame fades in. The farmer dashboard appears, name and metrics settling.        |
| 2 | Sold-out tap       | 15s      | 300–750     | Phone in mid-frame. Inventory page. A finger taps "Mark sold out" on eggs. Badge flips to brick. |
| 3 | The SMS swap loop  | 20s      | 750–1350    | Split: phone with SMS thread on left, roster on right updating live.                            |
| 4 | Tell the list      | 15s      | 1350–1800   | Desktop. Cursor opens the broadcast modal. Send. Replies arrive with a counter.                  |
| 5 | The directory      | 15s      | 1800–2250   | Phone. /find page. ZIP types in, pins drop, neighbor sends a note.                              |
| 6 | Close              | 15s      | 2250–2700   | Brand mark, pitch line, communicare.farm URL, $9 a month badge.                                  |

## On-screen copy

Use these strings verbatim. Each scene already renders them via the React
component — to change the words, edit the scene component, not this doc.
This is the authored intent; the components are the source of truth.

### Scene 1 — Cold open

> № 01 · Five minutes a day
>
> **Mary, at the farm desk.**
>
> *Monday, May 25*
> **Today on the farm.**
> 38 active shareholders · 12 Jersey cows · $4,370 this week's revenue

### Scene 2 — Sold-out tap

> № 02 · The market, eight a.m.
>
> **The eggs are gone. *One tap.***
>
> *The web store updates the same second. Members on the wait list get a
> text.*
>
> Inline notification: &ldquo;Eggs just opened up at Three Forks. Reply YES
> to claim a dozen at pickup.&rdquo;

### Scene 3 — The SMS swap loop

> № 03 · Monday morning
>
> **Members swap. Skip. Donate. *By texting back.***
>
> *The roster updates in real time. No phone calls. No inbox archaeology.*
>
> Inline SMS thread (phone): SMS from farm, member replies "skip 2", farm
> confirms "Done. Skipped May 27 and June 3. Account credited $72."
>
> Inline roster (browser): Linda&apos;s row flips to "Paused · 2 wks" badge.

### Scene 4 — Tell the list

> № 04 · A surprise wheel of cheddar
>
> **Tap once. *Tell the list.***
>
> *Eight in stock. First eight to reply win one. The rest get put on the
> alert list for next time.*
>
> Modal preview: &ldquo;Aged cheddar wheel just came in — 8 wheels at $24 a
> wheel. Reply CHEDDAR to claim one. First come, first served.&rdquo;

### Scene 5 — The directory

> № 05 · The discovery map
>
> **A neighbor finds you. *You wake up to a new member.***
>
> *Every farm we know about is listed — whether they&apos;re on Communicare
> or not. The directory is a gift. You keep the relationship.*

### Scene 6 — Close

> **For the farms**
> ***that feed us.***
>
> communicare.farm
>
> $9 a month · no setup · no contracts

## Audio

The music bed is fingerpicked acoustic guitar with a bowed cello drone
entering around the thirty-second mark. Generate or regenerate via:

```bash
ELEVENLABS_API_KEY=... npm run audio:screencast
```

Falls back to silence gracefully if `public/audio/screencast-soundtrack.mp3`
doesn&apos;t exist — useful for local dev without an API key.

## Notes for the next pass

- If we shorten by ten seconds, drop scene 4 and let scene 3 breathe.
- If we lengthen to two minutes, add a scene 7: the homepage drafter
  taking six honest sentences and returning a one-page site.
- Bigger type wins. The viewer reads at their own pace — never assume
  they&apos;re tracking with audio cues that aren&apos;t there.
