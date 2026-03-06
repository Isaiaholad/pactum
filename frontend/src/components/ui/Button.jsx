export default function Button({ children, className = '', variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-primary-600 hover:bg-indigo-500 text-white',
    ghost: 'bg-slate-800/70 hover:bg-slate-700 text-slate-100',
    danger: 'bg-danger-500 hover:bg-rose-400 text-white',
    success: 'bg-success-500 hover:bg-emerald-400 text-white',
  };

  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
