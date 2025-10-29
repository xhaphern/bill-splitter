// Central icon exports - Mix of Bootstrap Icons, Tabler, SVG Spinners and Phosphor
//
// INTENTIONAL DESIGN DECISIONS:
// - Mixed icon sources chosen for best visual match per icon (primarily Bootstrap Icons)
// - Mingcute icons used for LogIn/LogOut for their superior entrance/exit semantics
// - Each icon was individually selected via interactive comparison tool
// - Offline icon bundles preloaded for production (no CDN fetching)
// - To revert to original Phosphor icons, restore from icons.tsx.backup
//
// Icon sources:
// - Bootstrap Icons (bi:*) - 31 icons - Primary set for consistency
// - Mingcute (mingcute:*-line) - 2 icons - entrance-line, exit-line
// - Tabler (tabler:*) - 1 icon - copy
// - Phosphor (phosphor-react) - 1 icon - Home (kept from original)
// - SVG Spinners (svg-spinners:*) - 5 loader variants
// - Lucide (lucide-react) - 1 icon - Github
import { Github as GithubLucide } from "lucide-react";
import { Icon, addCollection } from '@iconify/react';
import { House as PhosphorHome } from "phosphor-react";

// Preload icon data for offline/production use (prevents CDN fetching)
import bootstrapIcons from '@iconify-json/bi/icons.json';
import mingcuteIcons from '@iconify-json/mingcute/icons.json';
import tablerIcons from '@iconify-json/tabler/icons.json';
import svgSpinnersIcons from '@iconify-json/svg-spinners/icons.json';

addCollection(bootstrapIcons);
addCollection(mingcuteIcons);
addCollection(tablerIcons);
addCollection(svgSpinnersIcons);

// Helper component to wrap Iconify icons with consistent sizing
// NOTE: Mingcute icons naturally render smaller than Bootstrap icons
// The 1.3x multiplier ensures visual consistency across all icon sets
const IconWrapper = ({ icon, size = 24, className = "", ...props }: { icon: string; size?: number; className?: string; [key: string]: any }) => {
  // Scale up Mingcute icons to match Bootstrap icon visual weight
  const adjustedSize = icon.startsWith('mingcute:') ? size * 1.3 : size;
  return <Icon icon={icon} width={adjustedSize} height={adjustedSize} className={className} style={{ pointerEvents: 'none' }} {...props} />;
};

// Navigation / chrome
export const Menu = (props: any) => <IconWrapper icon="bi:list" {...props} />;
export const X = (props: any) => <IconWrapper icon="bi:x-lg" {...props} />;

// Auth
export const LogIn = (props: any) => <IconWrapper icon="mingcute:entrance-line" {...props} />;
export const LogOut = (props: any) => <IconWrapper icon="mingcute:exit-line" {...props} />;
export const UserCircle = (props: any) => <IconWrapper icon="bi:person-circle" {...props} />;
export { GithubLucide as Github };

// General UI
export const Search = (props: any) => <IconWrapper icon="bi:search" {...props} />;
export const Receipt = (props: any) => <IconWrapper icon="bi:receipt" {...props} />;
export { PhosphorHome as Home }; // Keep current Phosphor icon
export const Clock3 = (props: any) => <IconWrapper icon="bi:clock" {...props} />;
export const ChevronRight = (props: any) => <IconWrapper icon="bi:chevron-right" {...props} />;
export const ChevronDown = (props: any) => <IconWrapper icon="bi:chevron-down" {...props} />;
export const MoreVertical = (props: any) => <IconWrapper icon="bi:three-dots-vertical" {...props} />;

// Actions
export const Plus = (props: any) => <IconWrapper icon="bi:plus-lg" {...props} />;
export const PlusCircle = (props: any) => <IconWrapper icon="bi:plus-circle" {...props} />;
export const Download = (props: any) => <IconWrapper icon="bi:download" {...props} />;
export const Upload = (props: any) => <IconWrapper icon="bi:upload" {...props} />;
export const Share2 = (props: any) => <IconWrapper icon="bi:share" {...props} />;
export const SaveIcon = (props: any) => <IconWrapper icon="bi:floppy" {...props} />;

// Content / context
export const Users = (props: any) => <IconWrapper icon="bi:people" {...props} />;
export const UserPlus = (props: any) => <IconWrapper icon="bi:person-plus" {...props} />;
export const Calculator = (props: any) => <IconWrapper icon="bi:calculator" {...props} />;
export const Pencil = (props: any) => <IconWrapper icon="bi:pencil" {...props} />;
export const CreditCard = (props: any) => <IconWrapper icon="bi:credit-card" {...props} />;
export const Phone = (props: any) => <IconWrapper icon="bi:telephone" {...props} />;
export const CheckCircle2 = (props: any) => <IconWrapper icon="bi:check-circle" {...props} />;
export const AlertTriangle = (props: any) => <IconWrapper icon="bi:exclamation-triangle" {...props} />;
export const XCircle = (props: any) => <IconWrapper icon="bi:x-circle" {...props} />;
export const Copy = (props: any) => <IconWrapper icon="tabler:copy" {...props} />; // Using Tabler
export const FileText = (props: any) => <IconWrapper icon="bi:file-text" {...props} />;
export const Calendar = (props: any) => <IconWrapper icon="bi:calendar" {...props} />;
export const Trash2 = (props: any) => <IconWrapper icon="bi:trash" {...props} />;
export const ScanText = (props: any) => <IconWrapper icon="bi:upc-scan" {...props} />;
export const Sun = (props: any) => <IconWrapper icon="bi:sun" {...props} />;
export const Moon = (props: any) => <IconWrapper icon="bi:moon-fill" {...props} />;

// Loading spinner - Primary option (blocks-shuffle-3)
export const Loader2 = (props: any) => <IconWrapper icon="svg-spinners:blocks-shuffle-3" {...props} />;

// Additional loader options available
export const LoaderRingResize = (props: any) => <IconWrapper icon="svg-spinners:ring-resize" {...props} />;
export const Loader180Ring = (props: any) => <IconWrapper icon="svg-spinners:180-ring" {...props} />;
export const Loader90RingWithBg = (props: any) => <IconWrapper icon="svg-spinners:90-ring-with-bg" {...props} />;
export const LoaderArrowRepeat = (props: any) => <IconWrapper icon="bi:arrow-repeat" {...props} />;

// Keep Google icon from custom component
export { Google } from "./icons/Google";

// Currency symbols
export { Rufiyaa } from "./icons/Rufiyaa";
