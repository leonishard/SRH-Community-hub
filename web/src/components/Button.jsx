import './Button.css';

export function Button({ variant = 'primary', children, ...rest }) {
  return (
    <button type="button" className={`btn btn--${variant} mono`} {...rest}>
      {children}
    </button>
  );
}
