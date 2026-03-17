'use client';

export default function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-grouse">{label}</span>
      <span className="text-swift">{value}</span>
    </div>
  );
}
