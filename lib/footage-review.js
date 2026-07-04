/**
 * Footage-review gate — the render-time enforcement for spoiler-video quarantine.
 *
 * WHY THIS EXISTS: the daily calendar-footage routine finds YouTube highlights and
 * commits them straight to `main`. `npm test` cannot tell a spoiler VIDEO from a
 * safe one (a URL is opaque — see docs/daily-calendar-footage-routine.md). So an
 * auto-found video must not render until a human has reviewed it. Every footage
 * entry (a race or stage carrying a watch `url`) gets a `review` record:
 *
 *   review: { status: "approved" | "pending" | "rejected", addedBy, added }
 *
 * The generators render a footage link ONLY when its entry is APPROVED. This is a
 * fail-CLOSED gate: anything not explicitly approved (pending, rejected, or missing
 * a review record entirely) does not render. That direction is deliberate — the
 * project's worst failure is a leaked result on the spoiler-free calendar, and a
 * missing highlight is a non-event ("when in doubt, skip").
 *
 * All footage that existed before the quarantine gate was migrated to `approved`
 * (addedBy "grandfather") by scripts/migrate-footage-review.js, so this gate never
 * silently drops the site's pre-existing videos.
 */

/** The review status of a footage entry, or 'unreviewed' if it has no review record. */
export function footageStatus(entry) {
  const s = entry && entry.review && entry.review.status;
  return typeof s === 'string' ? s : 'unreviewed';
}

/** True only if this footage entry has been explicitly approved for rendering. */
export function isFootageApproved(entry) {
  return footageStatus(entry) === 'approved';
}

/** True if the entry actually carries a watch URL (a real, non-TBD footage link). */
export function hasFootageUrl(entry) {
  return !!entry && typeof entry.url === 'string' && entry.url && entry.url !== 'TBD';
}
