<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Racing game questions come from a `createServerFn` in `src/lib/race/questions.functions.ts` that calls Lovable AI Gateway server-side (`questions.server.ts`); the client keeps a background-refilled queue with built-in fallback questions so the race never stalls when AI is slow or unavailable.
- Keep `ai` and `@ai-sdk/openai` on versions that share the same `@ai-sdk/provider` version; mismatches break typechecking.
