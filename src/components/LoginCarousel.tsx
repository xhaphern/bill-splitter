import { useState, useEffect } from "react";
import { ClockCounterClockwise, Users, User } from "phosphor-react";

interface Slide {
  icon: React.ComponentType<{ size?: number; className?: string; weight?: string }>;
  title: string;
  description: string;
  illustration: JSX.Element;
}

const slides: Slide[] = [
  {
    icon: ClockCounterClockwise,
    title: "History",
    description: "Track all your bills and expenses in one place. Never lose a receipt again.",
    illustration: (
      <div className="relative h-44 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Stack of bill cards with gradient */}
          <div className="relative">
            <div className="absolute top-0 left-6 w-32 h-40 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-400/30 backdrop-blur-sm transform -rotate-6 shadow-xl" />
            <div className="absolute top-1 left-3 w-32 h-40 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 border border-emerald-400/40 backdrop-blur-sm transform -rotate-3 shadow-xl" />
            <div className="relative w-32 h-40 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-400/50 backdrop-blur-md transform shadow-2xl p-3">
              <div className="h-2 w-16 bg-white/40 rounded mb-2" />
              <div className="h-1.5 w-12 bg-white/30 rounded mb-1.5" />
              <div className="h-1.5 w-20 bg-white/30 rounded mb-3" />
              <div className="absolute bottom-3 right-3">
                <ClockCounterClockwise size={24} weight="duotone" className="text-emerald-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Users,
    title: "Friends",
    description: "Split bills with friends easily. Keep track of who owes what.",
    illustration: (
      <div className="relative h-44 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Circle of friend avatars */}
          <div className="relative w-40 h-40">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/40 to-blue-600/30 border-2 border-blue-400/50 backdrop-blur-md flex items-center justify-center">
              <User size={20} weight="fill" className="text-blue-200" />
            </div>
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/40 to-purple-600/30 border-2 border-purple-400/50 backdrop-blur-md flex items-center justify-center">
              <User size={20} weight="fill" className="text-purple-200" />
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/40 to-pink-600/30 border-2 border-pink-400/50 backdrop-blur-md flex items-center justify-center">
              <User size={20} weight="fill" className="text-pink-200" />
            </div>
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/40 to-orange-600/30 border-2 border-orange-400/50 backdrop-blur-md flex items-center justify-center">
              <User size={20} weight="fill" className="text-orange-200" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/50 to-emerald-600/40 border-2 border-emerald-400/60 backdrop-blur-lg flex items-center justify-center shadow-xl">
              <Users size={28} weight="fill" className="text-emerald-100" />
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: User,
    title: "Profile",
    description: "Manage your account settings and preferences in your personal dashboard.",
    illustration: (
      <div className="relative h-44 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Profile card with settings */}
          <div className="relative w-40 h-44 rounded-3xl bg-gradient-to-br from-slate-700/40 to-slate-800/30 border border-slate-400/30 backdrop-blur-md p-4 shadow-2xl">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/50 to-emerald-600/40 border-2 border-emerald-400/60 flex items-center justify-center">
                <User size={32} weight="fill" className="text-emerald-100" />
              </div>
              <div className="w-full space-y-1.5">
                <div className="h-2.5 w-28 bg-white/40 rounded mx-auto" />
                <div className="h-2 w-20 bg-white/30 rounded mx-auto" />
              </div>
              <div className="w-full space-y-1.5 mt-1.5">
                <div className="h-6 w-full bg-white/20 rounded-lg border border-white/30" />
                <div className="h-6 w-full bg-white/20 rounded-lg border border-white/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export type SlideType = "history" | "friends" | "profile";

interface LoginCarouselProps {
  initialSlide?: SlideType;
}

const slideIndexMap: Record<SlideType, number> = {
  history: 0,
  friends: 1,
  profile: 2,
};

export default function LoginCarousel({ initialSlide = "history" }: LoginCarouselProps): JSX.Element {
  const [currentSlide, setCurrentSlide] = useState(slideIndexMap[initialSlide]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, []);

  const slide = slides[currentSlide];

  return (
    <div className="w-full max-w-md mx-auto min-h-[300px] flex flex-col">
      {/* Header with icon */}
      <div className="flex items-center justify-center gap-2 mb-3 flex-shrink-0">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-900/30">
          <slide.icon size={20} weight="duotone" className="text-emerald-300" />
        </div>
        <h2 className="text-xl font-semibold text-white">{slide.title}</h2>
      </div>

      {/* Illustration */}
      <div className="mb-3 transition-all duration-500 ease-in-out h-44 flex-shrink-0">
        {slide.illustration}
      </div>

      {/* Description - Fixed height to keep consistent across all slides */}
      <div className="h-20 mb-4 px-4 flex items-center justify-center flex-shrink-0">
        <p className="text-center text-slate-300 text-sm leading-relaxed">
          {slide.description}
        </p>
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center gap-2 flex-shrink-0">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? "w-8 bg-emerald-500"
                : "w-2 bg-slate-600 hover:bg-slate-500"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
