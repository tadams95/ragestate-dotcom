/**
 * Reusable page header component for admin sections
 * @param {string} title - Section title
 * @param {string} searchPlaceholder - Placeholder text for search input
 * @param {string} inputClassName - Styling for input (passed from parent)
 * @param {string} buttonClassName - Styling for button (passed from parent)
 * @param {function} onSearch - Optional search handler
 * @param {React.ReactNode} actions - Additional action buttons
 */
export default function AdminPageHeader({
  title,
  searchPlaceholder = 'Search...',
  inputClassName,
  buttonClassName,
  onSearch,
  actions,
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h2>
      <div className="flex space-x-2">
        {onSearch !== undefined && (
          <>
            <input type="text" placeholder={searchPlaceholder} className={inputClassName} />
            <button className={buttonClassName} onClick={onSearch}>
              Search
            </button>
          </>
        )}
        {actions}
      </div>
    </div>
  );
}
