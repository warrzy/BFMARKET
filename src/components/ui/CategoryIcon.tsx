import {
  Baby, Briefcase, Building2, Car, Download, Dumbbell, Footprints, Gem, GraduationCap, Hammer, Lamp, Laptop, Palette,
  Refrigerator, Shirt, Smartphone, Sofa, Sparkles, Sprout, Sun, Tag, Tv, Wheat, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  shirt: Shirt, smartphone: Smartphone, laptop: Laptop, tv: Tv, sparkles: Sparkles, gem: Gem, footprints: Footprints,
  lamp: Lamp, refrigerator: Refrigerator, car: Car, sofa: Sofa, sprout: Sprout, wheat: Wheat, palette: Palette,
  building: Building2, briefcase: Briefcase, "graduation-cap": GraduationCap, download: Download, baby: Baby,
  dumbbell: Dumbbell, hammer: Hammer, sun: Sun, tag: Tag,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const I = MAP[name] ?? Tag;
  return <I className={className} aria-hidden />;
}
