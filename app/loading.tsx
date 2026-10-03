import { Loader } from "@/components/ui/Loader";

export default function Loading() {
  return (
    <div className="flex-1 w-full min-h-[calc(100vh-10rem)] md:min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 transition-all duration-200">
      <Loader label="Loading content..." />
    </div>
  );
}

