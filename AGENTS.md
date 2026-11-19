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

- Finance requests use the database `finance_command` state machine; UI capability helpers mirror it to prevent competing approval paths.
- Finance reports read security-invoker movements and position functions; workbook manual actuals remain separate with reconciliation gaps to avoid treating forecasts as posted cash.
- Financial records are archived, not deleted; approval decisions and before/after audit history are retained for traceability.
- Generic AI tools cannot mutate protected finance tables; financial approvals must keep the authenticated decision and notification history.
- Financial attachments store object paths and obtain short-lived viewing links on demand so saved references do not expire.
- FinanceWorkspace is only a compatibility wrapper for FinanceCenter so there is one maintained Finance dashboard.
