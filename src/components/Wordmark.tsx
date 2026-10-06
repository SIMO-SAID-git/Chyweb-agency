import Image from 'next/image';
// Monogram is a cut-out of the supplied flat artwork; the text is a live wordmark until an official horizontal logo (true transparent PNG/SVG) is supplied.
export default function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight" dir="ltr">
      <Image src="/brand/icon-cyan.png" alt="" width={367} height={200} className="h-6 w-auto" />
      <span>Chy<span className="text-cyan">web</span></span>
    </span>
  );
}
