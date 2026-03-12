/**
 * Binds navigation controls (category, date, format, summary selects)
 * and the revalidate button to URL changes.
 */
export function initNavigation(): void {
  const categorySelect = document.getElementById("sel-category") as HTMLSelectElement | null;
  const dateInput = document.getElementById("sel-date") as HTMLInputElement | null;
  const formatSelect = document.getElementById("sel-format") as HTMLSelectElement | null;
  const summarySelect = document.getElementById("sel-summary") as HTMLSelectElement | null;
  const revalidateButton = document.getElementById("btn-revalidate");

  if (!categorySelect || !dateInput || !formatSelect || !summarySelect) return;

  const navigate = () => {
    const category = categorySelect.value;
    const date = dateInput.value.replace(/-/g, "");
    const format = formatSelect.value;
    const summary = summarySelect.value;

    const params = new URLSearchParams();
    params.set("format", format);
    params.set("date", date);
    if (summary) params.set("summary", summary);

    window.location.href = `/${category}?${params.toString()}`;
  };

  categorySelect.addEventListener("change", navigate);
  dateInput.addEventListener("change", navigate);
  formatSelect.addEventListener("change", navigate);
  summarySelect.addEventListener("change", navigate);

  revalidateButton?.addEventListener("click", () => {
    const params = new URLSearchParams(window.location.search);
    params.set("revalidate", "true");
    window.location.href = `${window.location.pathname}?${params.toString()}`;
  });
}
