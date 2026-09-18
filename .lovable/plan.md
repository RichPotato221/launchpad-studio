# Show all department portals

## Changes
- Display active departments even when their category is outside the four currently shown groups, including leadership portals such as Admin.
- Restore Protocol to the visible department list.
- Rename the department display name from “Ushers” to “Ushering” while keeping its existing portal and records intact.
- Verify the department page and confirm the app remains healthy.

## Technical details
- Add a leadership/other grouping fallback so no department returned by the portal is silently omitted.
- Update the existing department rows rather than changing their slugs, preserving links and stored relationships.
