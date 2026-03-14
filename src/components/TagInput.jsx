import { useState } from 'react';

export default function TagInput({ tags, onChange, placeholder = 'Add tag, press Enter...' }) {
  const [input, setInput] = useState('');

  const add = (value) => {
    const trimmed = value.trim().replace(/,+$/, '');
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(input);
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const remove = (tag) => onChange(tags.filter(t => t !== tag));

  return (
    <div className="tag-input-wrap" onClick={() => document.getElementById('tag-input-field')?.focus()}>
      {tags.map(tag => (
        <span key={tag} className="removable-tag">
          {tag}
          <button className="remove-tag" onClick={(e) => { e.stopPropagation(); remove(tag); }}>×</button>
        </span>
      ))}
      <input
        id="tag-input-field"
        className="tag-input-field"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => input.trim() && add(input)}
        placeholder={tags.length === 0 ? placeholder : ''}
      />
    </div>
  );
}
