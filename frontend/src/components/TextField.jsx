import { useId } from 'react';

// Champ de formulaire accessible : label relié au champ, message d'erreur annoncé aux lecteurs d'écran.
export default function TextField({ label, name, error, hint, action, ...inputProps }) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error && errorId, hint && !error && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-control">
        <input
          id={id}
          name={name}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {action}
      </div>
      {hint && !error && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
