import Link from "next/link";
import { Sun } from "@/components/mark";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-6 py-32 text-center">
      <Sun className="w-16 h-16 text-wheat mx-auto mb-8 opacity-60" />
      <div className="small-caps text-xs text-brick mb-4">Lost in the field</div>
      <h1 className="display text-5xl font-medium leading-tight mb-6">
        That page isn't here.
      </h1>
      <p className="text-soil/75 mb-10 italic">
        Maybe it's still growing. Maybe it was harvested last fall. Either
        way, the road back is below.
      </p>
      <Link href="/" className="btn btn-primary">
        Back to the homepage →
      </Link>
    </div>
  );
}
