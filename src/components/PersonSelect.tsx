import { useFamilyMembers } from "../lib/familyMeta";

interface Props {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Adds a "Shared / household" option, whose value is the given string. */
  sharedOption?: { value: string; label: string };
  /** Adds an "everyone" option at the top, for filters. */
  anyOption?: { value: string; label: string };
  className?: string;
  /** Hide entirely while the household is just one person. */
  hideWhenSolo?: boolean;
}

/**
 * A member picker. Kept in one place so every form and filter agrees on how
 * people, "Shared" and "Everyone" are represented.
 */
export function PersonSelect({
  id,
  label,
  value,
  onChange,
  sharedOption,
  anyOption,
  className,
  hideWhenSolo,
}: Props) {
  const { members, hasOthers } = useFamilyMembers();

  // Before anyone is invited, attribution has only one possible answer, so
  // showing the picker would be noise.
  if (hideWhenSolo && !hasOthers) return null;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink-muted">
          {label}
        </label>
      )}
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input ${label ? "mt-1" : ""}`}
      >
        {anyOption && <option value={anyOption.value}>{anyOption.label}</option>}
        {sharedOption && <option value={sharedOption.value}>{sharedOption.label}</option>}
        {members.map((m) => (
          <option key={m._id} value={m._id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
