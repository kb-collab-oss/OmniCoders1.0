import { useState } from 'react';
import TextField from './TextField';

export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      action={
        <button
          type="button"
          className="toggle-visibility"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {visible ? 'Masquer' : 'Afficher'}
        </button>
      }
    />
  );
}
