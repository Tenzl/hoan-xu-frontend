# SearchSelection

Reusable controlled combobox: `src/lib/search-selection.tsx` in this frontend repository.

```tsx
<SearchSelection
  id="bank"
  value={bank}
  onChange={setBank}
  options={bankOptions}
  debounceMs={500}
/>
```

Local options have `value`, `label`, and optional `keywords`. Matching ignores case, accents and spaces. Typing clears the previous selected value; the user must choose a result. Existing saved values remain visible until edited. Arrow keys select the active result, Enter confirms, Escape closes, and Tab leaves the field.

For a remote source, pass a stable `onSearch(query, signal)` callback returning a promise of options. Forward `signal` to fetch. Search waits 500ms after the latest edit; timer cleanup and AbortController discard superseded results, including callbacks that finish after cancellation. `debounceMs` can be configured. Pass `messages`, `placeholder`, `inputRef`, `onBlur`, `invalid` and `describedBy` to integrate with forms and translations.

The shared Form component accepts `Field.searchOptions` and connects the combobox through React Hook Form Controller. Bank options are maintained in `frontend/src/lib/banks.ts` and used in the account and withdrawal forms. Bank lookup happens locally and sends no search requests to the backend.
