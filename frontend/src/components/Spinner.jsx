export default function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex justify-center items-center py-8">
      <div className={`${sizes[size]} border-3 border-sand border-t-accent rounded-full animate-spin`} />
    </div>
  );
}
