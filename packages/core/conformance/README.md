# ChartDown 0.4 conformance cases

One file per section of the [ChartDown 0.4 spec](https://github.com/ChartDown/Language/blob/main/SPEC.md). Each case checks one rule. `src/conformance.test.ts` runs every case against `parse()` and fails if a spec section with parser rules has no passing case.

## Writing a case

````md
### 5.1 Chords inside one bar share it evenly

```chartdown
## A
1 4
```

```json
{
  "sections": [
    {
      "rows": [
        {
          "bars": [
            {
              "items": [
                { "root": "1", "beats": 1 },
                { "root": "4", "beats": 1 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```
````

- The heading starts with the spec section number, then the rule in plain words.
- The `json` block is a partial match: objects only need the fields shown; arrays need every element, so use `{}` for elements you don't check. `"warnings": []` asserts there are none.
- A `display` block (`{ "style": "letters", "key": "A" }`) checks the chords as shown instead of the parsed tree: the `json` block then has `homeKey`, `keys` (one per row) and `rows` (each row as `chord chord | chord`). See `12-numbers-and-letters.md`.
- A line `todo: T-xxx reason` under the heading marks a rule the parser does not meet yet; the case is listed as a todo test until that task fixes it.

Sections without parser rules: 1 (goals), 4.2 (views, handled by the per-instrument view), 16 (roadmap) and 17 (changelog).

The cases use original example songs only. Lyric landmarks stay at 8 words or fewer, except in the cases that test the limit.
