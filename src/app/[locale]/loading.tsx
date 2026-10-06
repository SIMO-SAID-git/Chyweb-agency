import Image from 'next/image';
export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="Loading">
      <Image src="/images/monogram.jpg" alt="" width={72} height={72} className="animate-pulse rounded-xl" />
    </div>
  );
}
