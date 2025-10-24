import { Icon } from '@iconify/react';

interface IconifyWrapperProps {
  icon: string;
  size?: number;
  className?: string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
}

/**
 * Wrapper component to make Iconify icons compatible with TabBar's Phosphor-style API
 * Usage: <IconifyWrapper icon="solar:home-bold-duotone" size={25} />
 */
export function createIconifyIcon(iconName: string) {
  return function IconifyIcon({ size = 24, className }: IconifyWrapperProps) {
    return <Icon icon={iconName} width={size} height={size} className={className} />;
  };
}

export default function IconifyWrapper({ icon, size = 24, className }: IconifyWrapperProps) {
  return <Icon icon={icon} width={size} height={size} className={className} />;
}
